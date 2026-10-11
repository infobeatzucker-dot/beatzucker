import { createHash, randomUUID } from "crypto";
import { execFile } from "child_process";
import { createWriteStream } from "fs";
import { mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { normalizeAnalysis } from "@/lib/analysisValidation";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 180;
export const runtime = "nodejs";
const run = promisify(execFile), ROOT = process.env.TEMP_UPLOAD_DIR || "./uploads", PYTHON = process.env.PYTHON_SERVICE_URL || "http://localhost:8001", MAX = 40 * 1024 * 1024;
const FORMATS = {
  aac256: { ext: "m4a", mime: "audio/mp4", args: ["-c:a", "aac", "-b:a", "256k"] },
  mp3320: { ext: "mp3", mime: "audio/mpeg", args: ["-c:a", "libmp3lame", "-b:a", "320k"] },
  mp3128: { ext: "mp3", mime: "audio/mpeg", args: ["-c:a", "libmp3lame", "-b:a", "128k"] },
} as const;

function valid(buffer: Buffer) {
  if (buffer.length < 12) return false;
  const first = buffer.subarray(0, 4).toString("ascii"), type = buffer.subarray(8, 12).toString("ascii");
  return (first === "RIFF" && type === "WAVE") || (first === "FORM" && (type === "AIFF" || type === "AIFC")) || first === "fLaC" || buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 255 && (buffer[1] & 224) === 224);
}
function clientKey(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`codec-preview:${clientKey(req)}`, 6, 60 * 60 * 1000)) return NextResponse.json({ error: "Codec preview limit reached." }, { status: 429 });
  let source = "", output = "", analysisPath = "";
  try {
    const declared = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(declared) && declared > MAX + 1024 * 1024) return NextResponse.json({ error: "Maximum file size is 40 MB." }, { status: 413 });
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) return NextResponse.json({ error: "Expected an audio upload." }, { status: 400 });
    const form = await req.formData(), file = form.get("file"), formatRaw = form.get("codec");
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX) return NextResponse.json({ error: "Invalid file or maximum 40 MB exceeded." }, { status: 413 });
    const format = typeof formatRaw === "string" && formatRaw in FORMATS ? formatRaw as keyof typeof FORMATS : "aac256", config = FORMATS[format];
    if (!valid(Buffer.from(await file.slice(0, 32).arrayBuffer()))) return NextResponse.json({ error: "Unsupported audio data." }, { status: 415 });
    await mkdir(/*turbopackIgnore: true*/ ROOT, { recursive: true });
    const id = randomUUID(), root = path.resolve(/*turbopackIgnore: true*/ ROOT);
    source = path.resolve(/*turbopackIgnore: true*/ ROOT, `codec-${id}.input`); output = path.resolve(/*turbopackIgnore: true*/ ROOT, `codec-${id}.${config.ext}`); analysisPath = path.resolve(/*turbopackIgnore: true*/ ROOT, `codec-${id}-analysis.wav`);
    if ([source, output, analysisPath].some(candidate => path.relative(root, candidate).startsWith(".."))) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    await pipeline(Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(/*turbopackIgnore: true*/ source, { flags: "wx" }));
    const infoResponse = await fetch(`${PYTHON}/info`, { method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: source }), signal: AbortSignal.timeout(15000) });
    if (!infoResponse.ok) return NextResponse.json({ error: "The audio file could not be decoded." }, { status: 415 });
    const info = await infoResponse.json();
    if (!Number.isFinite(info.duration) || info.duration <= 0 || info.duration > 600) return NextResponse.json({ error: "Codec previews support tracks up to 10 minutes." }, { status: 413 });
    const ffmpeg = process.env.FFMPEG_BINARY || "ffmpeg";
    await run(ffmpeg, ["-v", "error", "-nostdin", "-i", source, "-map_metadata", "-1", "-vn", ...config.args, "-y", output], { timeout: 150000, maxBuffer: 1024 * 1024 });

    // Decode every codec back to PCM before analysis. libsndfile can read MP3
    // directly but not every AAC/M4A build, which previously omitted AAC peak.
    let truePeak = "";
    try {
      await run(ffmpeg, ["-v", "error", "-nostdin", "-i", output, "-vn", "-c:a", "pcm_s24le", "-y", analysisPath], { timeout: 150000, maxBuffer: 1024 * 1024 });
      const analysisResponse = await fetch(`${PYTHON}/analyze`, { method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: analysisPath }), signal: AbortSignal.timeout(150000) });
      if (analysisResponse.ok) { const analysis = normalizeAnalysis(await analysisResponse.json()); if (analysis) truePeak = analysis.true_peak.toFixed(2); }
    } catch (error) { console.warn("Codec true-peak measurement failed", error); }
    const bytes = await readFile(/*turbopackIgnore: true*/ output);
    return new NextResponse(bytes, { headers: { "Content-Type": config.mime, "Content-Length": String(bytes.length), "Cache-Control": "no-store, private", "X-Codec-Format": format, ...(truePeak ? { "X-Encoded-True-Peak": truePeak } : {}) } });
  } catch (error) {
    console.error("Codec preview failed", error);
    return NextResponse.json({ error: "Codec preview could not be rendered." }, { status: 503 });
  } finally {
    for (const candidate of [source, output, analysisPath]) if (candidate) await unlink(/*turbopackIgnore: true*/ candidate).catch(() => {});
  }
}
