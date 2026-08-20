import { createHash, randomUUID } from "crypto";
import { createWriteStream, existsSync } from "fs";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { normalizeAnalysis } from "@/lib/analysisValidation";
import { rateLimit } from "@/lib/rateLimit";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { sanitizeOriginalFilename } from "@/lib/filename";

export const maxDuration = 180;

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
const MAX_SIZE = 40 * 1024 * 1024;
const MAX_DURATION_SECONDS = 10 * 60;
const ACCEPTED_MIMES = new Set([
  "audio/wav", "audio/x-wav", "audio/wave", "audio/flac", "audio/x-flac",
  "audio/mpeg", "audio/mp3", "audio/aiff", "audio/x-aiff",
]);
const MIME_TO_EXT: Record<string, string> = {
  "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
  "audio/flac": "flac", "audio/x-flac": "flac",
  "audio/mpeg": "mp3", "audio/mp3": "mp3",
  "audio/aiff": "aiff", "audio/x-aiff": "aiff",
};

function validMagic(buf: Buffer) {
  if (buf.length < 12) return false;
  const first = buf.subarray(0, 4).toString("ascii");
  const type = buf.subarray(8, 12).toString("ascii");
  if ((first === "RIFF" && type === "WAVE") || (first === "FORM" && (type === "AIFF" || type === "AIFC"))) return true;
  if (first === "fLaC" || buf.subarray(0, 3).toString("ascii") === "ID3") return true;
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && (buf[1] & 0x06) !== 0;
}

function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = req.headers.get("cf-connecting-ip") || forwarded || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 24);
}

export async function POST(req: NextRequest) {
  const key = clientKey(req);
  if (!rateLimit(`public-mix-check:${key}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Mix-Check limit reached. Please try again later." }, { status: 429 });
  }

  let filePath: string | null = null;
  try {
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SIZE + 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 40 MB." }, { status: 413 });
    }
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected an audio upload." }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_SIZE) return NextResponse.json({ error: "File too large. Maximum size is 40 MB." }, { status: 413 });
    if (!ACCEPTED_MIMES.has(file.type)) return NextResponse.json({ error: "Use WAV, FLAC, MP3 or AIFF." }, { status: 415 });
    if (!validMagic(Buffer.from(await file.slice(0, 32).arrayBuffer()))) {
      return NextResponse.json({ error: "The file does not contain supported audio data." }, { status: 415 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = MIME_TO_EXT[file.type] || "wav";
    filePath = path.resolve(path.join(UPLOAD_DIR, `mixcheck-${randomUUID()}.${ext}`));
    const uploadRoot = path.resolve(UPLOAD_DIR);
    if (path.relative(uploadRoot, filePath).startsWith("..")) {
      return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
    }
    await pipeline(Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(filePath, { flags: "wx" }));

    const infoResponse = await fetch(`${PYTHON_URL}/info`, {
      method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: filePath }), signal: AbortSignal.timeout(15000),
    });
    if (!infoResponse.ok) return NextResponse.json({ error: "The audio file could not be decoded." }, { status: 415 });
    const info = await infoResponse.json();
    if (!Number.isFinite(info.duration) || info.duration <= 0 || info.duration > MAX_DURATION_SECONDS) {
      return NextResponse.json({ error: "The public Mix Check supports tracks up to 10 minutes." }, { status: 413 });
    }

    const analysisResponse = await fetch(`${PYTHON_URL}/analyze`, {
      method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: filePath }), signal: AbortSignal.timeout(160000),
    });
    if (!analysisResponse.ok) return NextResponse.json({ error: "Audio analysis failed." }, { status: analysisResponse.status });
    const analysis = normalizeAnalysis(await analysisResponse.json());
    if (!analysis) return NextResponse.json({ error: "The analyzer returned invalid measurements." }, { status: 502 });

    return NextResponse.json(
      { analysis, filename: sanitizeOriginalFilename(file.name, `track.${ext}`) },
      { headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex" } },
    );
  } catch (error: unknown) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("Public mix check error:", error);
    return NextResponse.json({ error: timeout ? "Analysis timed out." : "Mix Check is temporarily unavailable." }, { status: timeout ? 504 : 503 });
  } finally {
    if (filePath && existsSync(filePath)) await unlink(filePath).catch(() => {});
  }
}
