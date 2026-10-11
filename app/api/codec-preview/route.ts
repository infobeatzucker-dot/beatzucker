import { createHash, randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { readBoundedMultipart, uploadRequestFailure } from "@/lib/boundedMultipart";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 180;
export const runtime = "nodejs";
const ROOT = process.env.TEMP_UPLOAD_DIR || "./uploads";
const PYTHON = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
const MAX = 40 * 1024 * 1024;
const FORMATS: Record<string, string> = { aac256: "audio/mp4", mp3320: "audio/mpeg", mp3128: "audio/mpeg" };
const state = globalThis as typeof globalThis & { __codecRequests?: number };

function valid(buffer: Buffer) {
  if (buffer.length < 12) return false;
  const first = buffer.subarray(0, 4).toString("ascii"), type = buffer.subarray(8, 12).toString("ascii");
  return (first === "RIFF" && type === "WAVE") || (first === "FORM" && (type === "AIFF" || type === "AIFC")) || first === "fLaC" || buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 255 && (buffer[1] & 224) === 224);
}
function clientKey(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}
async function readForm(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX + 1024 * 1024) { await reader.cancel(); throw new Error("TOO_LARGE"); }
      chunks.push(new Uint8Array(value));
    }
  } finally { reader.releaseLock(); }
  try {
    return await new Response(new Blob(chunks), { headers: { "Content-Type": req.headers.get("content-type")! } }).formData();
  } catch { throw new Error("INVALID_BODY"); }
}
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if ((state.__codecRequests ?? 0) >= 2)
    return NextResponse.json({ error: "Audio service busy. Please try again shortly. / Audiodienst ausgelastet. Bitte gleich erneut versuchen." }, { status: 503, headers: { "Retry-After": "15" } });
  // Global ceiling cannot be bypassed with forged client proxy headers.
  if (!rateLimit("codec-preview:global", 60, 60 * 60 * 1000) || !rateLimit(`codec-preview:${clientKey(req)}`, 6, 60 * 60 * 1000))
    return NextResponse.json({ error: "Codec preview limit reached. / Limit für Codec-Vorschauen erreicht." }, { status: 429 });
  state.__codecRequests = (state.__codecRequests ?? 0) + 1;
  let source = "";
  let release: (() => void) | undefined;
  try {
    if (Number(req.headers.get("content-length")) > MAX + 1024 * 1024)
      return NextResponse.json({ error: "Maximum file size is 40 MB." }, { status: 413 });
    if (!req.headers.get("content-type")?.includes("multipart/form-data"))
      return NextResponse.json({ error: "Expected an audio upload." }, { status: 400 });
    const upload = await readBoundedMultipart(req, MAX);
    release = upload.release;
    const form = upload.form, file = form.get("file"), codec = form.get("codec");
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX)
      return NextResponse.json({ error: "Invalid file or maximum 40 MB exceeded." }, { status: 413 });
    if (typeof codec !== "string" || !Object.hasOwn(FORMATS, codec))
      return NextResponse.json({ error: "Unsupported codec. / Nicht unterstützter Codec." }, { status: 400 });
    if (!valid(Buffer.from(await file.slice(0, 32).arrayBuffer())))
      return NextResponse.json({ error: "Unsupported audio data." }, { status: 415 });
    await mkdir(/*turbopackIgnore: true*/ ROOT, { recursive: true });
    source = path.resolve(/*turbopackIgnore: true*/ ROOT, `codec-${randomUUID()}.input`);
    await pipeline(Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(/*turbopackIgnore: true*/ source, { flags: "wx" }));
    // Encoding + metering stay under ONE permit in the same Python service as mastering.
    const response = await fetch(`${PYTHON}/codec-preview`, {
      method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: source, codec }),
      signal: AbortSignal.timeout(160000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: response.status === 503
        ? "Audio service busy. Please try again shortly. / Audiodienst ausgelastet. Bitte gleich erneut versuchen."
        : "Codec rendering failed. Check the file and try again. / Codec-Rendering fehlgeschlagen. Bitte die Datei prüfen und erneut versuchen." },
        { status: [400, 413, 415, 422, 503].includes(response.status) ? response.status : 502,
          ...(response.status === 503 ? { headers: { "Retry-After": "15" } } : {}) });
    }
    if (response.headers.get("X-Codec-Format") !== codec || !response.headers.get("Content-Type")?.startsWith(FORMATS[codec]))
      throw new Error("Invalid codec output");
    const headers: Record<string, string> = {
      "Content-Type": FORMATS[codec], "Cache-Control": "no-store, private", "X-Codec-Format": codec, "X-Robots-Tag": "noindex",
    };
    for (const key of ["X-Encoded-True-Peak", "X-Encoded-LUFS"]) {
      const value = response.headers.get(key);
      if (value !== null && value.trim() !== "" && Number.isFinite(Number(value))) headers[key] = value;
    }
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 32 * 1024 * 1024) throw new Error("Invalid codec output size");
    return new NextResponse(bytes, { headers });
  } catch (error) {
    const failure = uploadRequestFailure(error);
    if (failure) return failure;
    console.error("Codec preview failed", error);
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: code === "TOO_LARGE" ? "Maximum file size is 40 MB." : "Codec preview could not be rendered. / Codec-Vorschau konnte nicht erstellt werden." },
      { status: code === "TOO_LARGE" ? 413 : code === "INVALID_BODY" ? 400 : 503 });
  } finally {
    release?.();
    if (source) await unlink(/*turbopackIgnore: true*/ source).catch(() => {});
    state.__codecRequests = Math.max(0, (state.__codecRequests ?? 1) - 1);
  }
}
