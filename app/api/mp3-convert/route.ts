import { randomUUID } from "crypto";
import { mkdir, open, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { readBoundedMultipart, uploadRequestFailure } from "@/lib/boundedMultipart";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 180;
const MAX = 80 * 1024 * 1024;
const state = globalThis as typeof globalThis & { __mp3Converts?: number };
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin) return fail("Forbidden", 403);
  if ((state.__mp3Converts ?? 0) >= 1) return fail("Conversion service busy. Please retry shortly. / Konverter ausgelastet. Bitte gleich erneut versuchen.", 503);
  if (!rateLimit("mp3-convert:global", 60, 3600000)) return fail("Conversion limit reached. Please retry later. / Konvertierungs-Limit erreicht. Bitte später erneut versuchen.", 429);
  state.__mp3Converts = (state.__mp3Converts ?? 0) + 1;
  let source = "", owned = false, release: (() => void) | undefined;
  try {
    const upload = await readBoundedMultipart(req, MAX); release = upload.release;
    const file = upload.form.get("file"), quality = upload.form.get("quality");
    if (!(file instanceof File) || file.size < 44 || file.size > MAX) return fail("Choose a WAV file up to 80 MB. / Bitte eine WAV-Datei bis 80 MB wählen.", 413);
    if (quality !== "128" && quality !== "320") return fail("Choose 128 or 320 kbit/s. / Bitte 128 oder 320 kbit/s wählen.", 400);
    const magic = Buffer.from(await file.slice(0,12).arrayBuffer());
    if (magic.subarray(0,4).toString() !== "RIFF" || magic.subarray(8,12).toString() !== "WAVE") return fail("This is not a supported WAV file. / Dies ist keine unterstützte WAV-Datei.", 415);
    const root = process.env.TEMP_UPLOAD_DIR || "./uploads";
    await mkdir(/*turbopackIgnore: true*/ root, { recursive: true });
    source = path.resolve(/*turbopackIgnore: true*/ root, `mp3-convert-${randomUUID()}.wav`);
    const handle = await open(/*turbopackIgnore: true*/ source, "wx"); owned = true;
    try { await pipeline(Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]), handle.createWriteStream()); }
    finally { await handle.close().catch(() => {}); }
    const codec = `mp3${quality}`;
    const result = await fetch(`${process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8001"}/codec-preview`, {
      method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: source, codec, mp3_export: true }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(160000)]),
    });
    if (!result.ok) return fail(result.status === 503 ? "Audio service busy. Please retry shortly. / Audiodienst ausgelastet. Bitte gleich erneut versuchen." : "Conversion failed. Use mono/stereo WAV up to 10 minutes and 192 kHz. / Konvertierung fehlgeschlagen. Bitte Mono-/Stereo-WAV bis 10 Minuten und 192 kHz verwenden.", result.status === 503 ? 503 : 422);
    if (result.headers.get("X-Codec-Format") !== codec || !result.headers.get("Content-Type")?.startsWith("audio/mpeg")) throw Error("Invalid codec response");
    const reader = result.body?.getReader(); if (!reader) throw Error("Missing MP3");
    const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
    try { for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 32*1024*1024) { await reader.cancel(); throw Error("Output too large"); } chunks.push(new Uint8Array(next.value)); } } finally { reader.releaseLock(); }
    if (size < 100) throw Error("Empty MP3");
    const responseHeaders: Record<string,string> = { ...headers, "Content-Type": "audio/mpeg", "Content-Disposition": `attachment; filename="beatzucker-${quality}.mp3"`, "X-MP3-Bitrate": quality };
    const peak = result.headers.get("X-Encoded-True-Peak");
    if (peak !== null && peak.trim() && Number.isFinite(Number(peak))) responseHeaders["X-Encoded-True-Peak"] = peak;
    return new Response(new Blob(chunks, { type: "audio/mpeg" }), { headers: responseHeaders });
  } catch (error) { return uploadRequestFailure(error) ?? fail("Conversion interrupted or unavailable. Please try again. / Konvertierung unterbrochen oder nicht verfügbar. Bitte erneut versuchen.", 503); }
  finally { release?.(); if (owned) await unlink(/*turbopackIgnore: true*/ source).catch(() => {}); state.__mp3Converts = Math.max(0,(state.__mp3Converts ?? 1)-1); }
}
