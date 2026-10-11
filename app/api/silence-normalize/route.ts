import { randomUUID } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { parseNormalizationResult } from "@/lib/types/normalization";

export const maxDuration = 180;
export const runtime = "nodejs";
const MAX_FILE = 40 * 1024 * 1024;
const MAX_BODY = MAX_FILE + 1024 * 1024;
const state = globalThis as typeof globalThis & { __trimRequests?: number };
const germanErrors: Record<string, string> = {
  "The audio file could not be decoded.": "Die Audiodatei konnte nicht dekodiert werden.",
  "The selected section is too quiet to measure loudness.": "Der gewählte Ausschnitt ist für eine Lautheitsmessung zu leise.",
  "Invalid cut points or loudness target.": "Ungültige Schnittpunkte oder Ziellautheit.",
  "Use mono/stereo audio up to 10 minutes at 8–192 kHz.": "Bitte Mono-/Stereo-Audio bis 10 Minuten mit 8–192 kHz verwenden.",
  "Invalid cut points.": "Ungültige Schnittpunkte.",
  "Select at least 0.4 seconds for integrated loudness measurement.": "Bitte für die Lautheitsmessung mindestens 0,4 Sekunden auswählen.",
  "The selected section exceeds the memory budget. Please select a shorter section.": "Der Ausschnitt überschreitet die Speichergrenze. Bitte einen kürzeren Bereich auswählen.",
  "Audio contains invalid samples.": "Die Audiodatei enthält ungültige Samples.",
  "The output peak could not be verified safely.": "Der Spitzenpegel des Ergebnisses konnte nicht sicher geprüft werden.",
};

/** Bound real bytes even without Content-Length before multipart parsing. */
async function readForm(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
      chunks.push(new Uint8Array(value));
    }
  } finally { reader.releaseLock(); }
  try {
    return await new Response(new Blob(chunks), { headers: { "Content-Type": req.headers.get("content-type")! } }).formData();
  } catch { throw new Error("INVALID_MULTIPART"); }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if ((state.__trimRequests ?? 0) >= 2)
    return NextResponse.json({ error: "Server busy. Please try again shortly. / Server ausgelastet. Bitte gleich erneut versuchen." }, { status: 503, headers: { "Retry-After": "15" } });
  // Do not let arbitrary client proxy headers bypass the public ceiling.
  if (!rateLimit("public:trim-normalize", 60, 60 * 60_000))
    return NextResponse.json({ error: "Normalization limit reached. Please try again later. / Limit erreicht. Bitte später erneut versuchen." }, { status: 429 });
  state.__trimRequests = (state.__trimRequests ?? 0) + 1;
  let source = "";
  try {
    if (!req.headers.get("content-type")?.includes("multipart/form-data"))
      return NextResponse.json({ error: "Expected an audio upload." }, { status: 400 });
    if (Number(req.headers.get("content-length")) > MAX_BODY)
      return NextResponse.json({ error: "Maximum file size: 40 MB." }, { status: 413 });
    const form = await readForm(req), file = form.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE)
      return NextResponse.json({ error: "Maximum file size: 40 MB." }, { status: 413 });
    const numeric = (key: string) => {
      const value = form.get(key);
      return typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
    };
    const start = numeric("start"), end = numeric("end"), target = numeric("target");
    if (![start, end, target].every(Number.isFinite) || start < 0 || end <= start || end > 600.02 || target < -23 || target > -9)
      return NextResponse.json({ error: "Invalid cut points or target." }, { status: 400 });
    const bytes = Buffer.from(await file.slice(0, 32).arrayBuffer());
    const first = bytes.subarray(0, 4).toString("ascii"), kind = bytes.subarray(8, 12).toString("ascii");
    if (bytes.length < 12 || !((first === "RIFF" && kind === "WAVE") || (first === "FORM" && ["AIFF", "AIFC"].includes(kind)) || first === "fLaC" || bytes.subarray(0, 3).toString("ascii") === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224)))
      return NextResponse.json({ error: "Use WAV, FLAC, MP3 or AIFF." }, { status: 415 });
    const root = path.resolve(/*turbopackIgnore: true*/ process.env.TEMP_UPLOAD_DIR ?? "./uploads");
    await mkdir(/*turbopackIgnore: true*/ root, { recursive: true });
    source = path.join(/*turbopackIgnore: true*/ root, `trim-${randomUUID()}.input`);
    await pipeline(Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(/*turbopackIgnore: true*/ source, { flags: "wx" }));
    const response = await fetch(`${process.env.PYTHON_SERVICE_URL ?? "http://localhost:8001"}/trim-normalize`, {
      method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: source, start, end, target }),
      signal: AbortSignal.timeout(160_000),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      const validationError = typeof detail.detail === "string" ? detail.detail : "Invalid audio section.";
      return NextResponse.json({ error: response.status === 422
        ? (form.get("lang") === "de" ? germanErrors[validationError] ?? "Der Ausschnitt konnte nicht normalisiert werden." : validationError)
        : "Normalization unavailable. Please try again. / Normalisierung nicht verfügbar. Bitte erneut versuchen." }, { status: [413, 415, 422, 503].includes(response.status) ? response.status : 502 });
    }
    const stats = parseNormalizationResult(response.headers.get("X-Normalization-Stats"));
    const output = await response.arrayBuffer();
    if (output.byteLength < 44 || output.byteLength > 96_000_100) throw new Error("INVALID_OUTPUT");
    return new NextResponse(output, { headers: {
      "Content-Type": "audio/wav", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex",
      "X-Normalization-Stats": JSON.stringify(stats),
    } });
  } catch (error) {
    const oversized = error instanceof Error && error.message === "BODY_TOO_LARGE";
    const malformed = error instanceof Error && ["EMPTY_BODY", "INVALID_MULTIPART"].includes(error.message);
    console.error("[trim-normalize] request failed", error);
    return NextResponse.json({ error: oversized ? "Maximum file size: 40 MB." : malformed ? "Invalid audio upload. / Ungültiger Audio-Upload." : "Normalization failed. Please try again. / Normalisierung fehlgeschlagen. Bitte erneut versuchen." }, { status: oversized ? 413 : malformed ? 400 : 503 });
  } finally {
    if (source) await unlink(/*turbopackIgnore: true*/ source).catch(() => {});
    state.__trimRequests = Math.max(0, (state.__trimRequests ?? 1) - 1);
  }
}
