import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink } from "fs/promises";
import { createWriteStream, existsSync } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { rateLimit } from "@/lib/rateLimit";
import { signUpload } from "@/lib/uploadAuthorization";
import { sanitizeOriginalFilename } from "@/lib/filename";
import { pythonServiceHeaders } from "@/lib/pythonService";

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";
const MAX_SIZE = 200 * 1024 * 1024; // 200MB
const ACCEPTED_MIMES = [
  "audio/wav", "audio/x-wav", "audio/wave",
  "audio/flac", "audio/x-flac",
  "audio/mpeg", "audio/mp3",
  "audio/aiff", "audio/x-aiff",
  "audio/ogg", "application/ogg",
  "audio/mp4", "audio/x-m4a",
];

/**
 * Validate audio file magic bytes server-side.
 * Returns true if the buffer matches a known audio container signature.
 * This prevents renaming arbitrary files to .wav/.mp3 etc. to bypass MIME checks.
 */
function hasValidAudioMagicBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // WAV / AIFF: RIFF....WAVE  or  FORM....AIFF
  const riff = buf.slice(0, 4).toString("ascii");
  const ftype = buf.slice(8, 12).toString("ascii");
  if ((riff === "RIFF" && ftype === "WAVE") || (riff === "FORM" && (ftype === "AIFF" || ftype === "AIFC"))) return true;
  // FLAC
  if (buf.slice(0, 4).toString("ascii") === "fLaC") return true;
  // OGG (Vorbis, Opus)
  if (buf.slice(0, 4).toString("ascii") === "OggS") return true;
  // MP3: ID3v2 tag header
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true; // "ID3"
  // MP3: MPEG sync word (0xFF followed by 0xE0–0xFF for MPEG-1/2/2.5 layers)
  // Check first 3 bytes to avoid false positives
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0 && (buf[1] & 0x06) !== 0) return true;
  // MP4 / M4A / AAC-in-MP4: ftyp box (box size + "ftyp" at bytes 4–7)
  if (buf.slice(4, 8).toString("ascii") === "ftyp") return true;
  // AAC / ADTS: sync word 0xFFF1 (MPEG-4 AAC) or 0xFFF9 (MPEG-2 AAC)
  if (buf[0] === 0xFF && (buf[1] === 0xF1 || buf[1] === 0xF9)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  // Require authentication — no anonymous uploads
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Anmeldung erforderlich" }, { status: 401 });
  }

  // Rate limit: 10 uploads per 10 minutes per user
  if (!rateLimit(`upload:${session.user.id}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Zu viele Uploads. Bitte warte kurz." }, { status: 429 });
  }

  try {
    const declaredLength = Number(req.headers.get("content-length") ?? 0);
    // Multipart boundaries and headers need only a few KB; allow 1 MB overhead.
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SIZE + 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 200MB." }, { status: 413 });
    }
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Must be multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large. Max 200MB.` }, { status: 413 });
    }

    if (!ACCEPTED_MIMES.includes(file.type)) {
      return NextResponse.json({
        error: `Unsupported format: ${file.type}. Use WAV, FLAC, MP3, AIFF, OGG, or M4A.`,
      }, { status: 415 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const signature = Buffer.from(await file.slice(0, 32).arrayBuffer());

    // Validate actual file content via magic bytes (prevents MIME spoofing)
    if (!hasValidAudioMagicBytes(signature)) {
      return NextResponse.json({
        error: "File content does not match a supported audio format.",
      }, { status: 415 });
    }

    const fileId = randomUUID();
    const uploadToken = signUpload(fileId, session.user.id);
    if (!uploadToken) {
      return NextResponse.json({ error: "Upload-Signatur ist nicht konfiguriert" }, { status: 500 });
    }
    // Derive extension from validated MIME type, not client filename
    const MIME_TO_EXT: Record<string, string> = {
      "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
      "audio/flac": "flac", "audio/x-flac": "flac",
      "audio/mpeg": "mp3", "audio/mp3": "mp3",
      "audio/aiff": "aiff", "audio/x-aiff": "aiff",
      "audio/ogg": "ogg", "application/ogg": "ogg",
      "audio/mp4": "m4a", "audio/x-m4a": "m4a",
    };
    const ext = MIME_TO_EXT[file.type] ?? "wav";
    const filename = `${fileId}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
      const webStream = file.stream() as Parameters<typeof Readable.fromWeb>[0];
      await pipeline(Readable.fromWeb(webStream), createWriteStream(filePath, { flags: "wx" }));
    } catch {
      await unlink(filePath).catch(() => {});
      return NextResponse.json({ error: "Upload could not be stored." }, { status: 500 });
    }

    // Validate decodability, channel count and duration before accepting the
    // upload. Continuing with duration=0 only postpones an inevitable failure
    // until the expensive analysis/mastering request.
    let duration = 0;
    const pythonUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
    try {
      const infoRes = await fetch(`${pythonUrl}/info`, {
        method: "POST",
        headers: pythonServiceHeaders(),
        body: JSON.stringify({ file_path: filePath }),
        signal: AbortSignal.timeout(10000),
      });
      if (!infoRes.ok) {
        const detail = await infoRes.text().catch(() => "");
        await unlink(filePath).catch(() => {});
        return NextResponse.json({
          error: detail || "Audio file is not a supported mono/stereo track.",
        }, { status: infoRes.status });
      }
      const info = await infoRes.json();
      duration = info.duration || 0;
    } catch {
      await unlink(filePath).catch(() => {});
      return NextResponse.json({
        error: "Audio validation service is temporarily unavailable.",
      }, { status: 503 });
    }

    return NextResponse.json({
      file_id: fileId,
      upload_token: uploadToken,
      filename: sanitizeOriginalFilename(file.name, `track.${ext}`),
      duration,
      format: ext.toUpperCase(),
      size: file.size,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
