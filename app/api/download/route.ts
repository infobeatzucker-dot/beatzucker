import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { DOWNLOAD_WINDOW_MS } from "@/lib/constants";
import { removeMasterFiles } from "@/lib/storage";

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";

const FORMAT_MIME: Record<string, string> = {
  wav32:  "audio/wav",
  wav24:  "audio/wav",
  wav16:  "audio/wav",
  flac:   "audio/flac",
  mp3320: "audio/mpeg",
  mp3128: "audio/mpeg",
  aac256: "audio/mp4",
};

const FORMAT_EXT: Record<string, string> = {
  wav32: "wav", wav24: "wav", wav16: "wav",
  flac: "flac",
  mp3320: "mp3", mp3128: "mp3",
  aac256: "m4a",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const masterId = searchParams.get("master_id");
  const format   = searchParams.get("format") || "mp3128";

  if (!masterId) {
    return NextResponse.json({ error: "master_id required" }, { status: 400 });
  }
  if (!(format in FORMAT_EXT)) {
    return NextResponse.json({ error: "Ungültiges Format" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── IDOR guard: master must belong to this user ───────────────────────────
  const masterRecord = await db.master.findUnique({
    where: { id: masterId },
    select: { userId: true, status: true, createdAt: true, completedAt: true, originalName: true },
  });
  if (!masterRecord) {
    return NextResponse.json({ error: "Master nicht gefunden." }, { status: 404 });
  }
  if (masterRecord.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (masterRecord.status !== "done") {
    return NextResponse.json({ error: "Dieses Mastering ist nicht als fertig bestätigt." }, { status: 409 });
  }

  // ── Download time-window check ─────────────────────────────────────────────
  const completedAt = masterRecord.completedAt ?? masterRecord.createdAt;
  const expiresAt = new Date(completedAt.getTime() + DOWNLOAD_WINDOW_MS);
  if (new Date() > expiresAt) {
    await removeMasterFiles(masterId);
    return NextResponse.json({
      error: `Download-Fenster abgelaufen (${DOWNLOAD_WINDOW_MS / 3600000}h).`,
    }, { status: 410 });
  }

  // ── Serve file ────────────────────────────────────────────────────────────
  const actualFormat = format;
  const filePath = path.join(UPLOAD_DIR, "masters", `${masterId}_${format}.${FORMAT_EXT[format]}`);

  if (!existsSync(filePath)) {
    return NextResponse.json({
      error: "Dieses Format wurde nicht erzeugt oder ist abgelaufen.",
    }, { status: 404 });
  }

  const ext      = FORMAT_EXT[actualFormat] || "mp3";
  const mime     = FORMAT_MIME[actualFormat] || "audio/mpeg";
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile() || fileStat.size === 0) {
    return NextResponse.json({ error: "Die Master-Datei ist nicht mehr verfügbar." }, { status: 404 });
  }
  const fileSize = fileStat.size;

  // Build download filename: beatzucker_songname_format.ext
  const rawName  = masterRecord.originalName ?? masterId;
  const baseName = rawName.replace(/\.[^/.]+$/, "");          // strip extension
  const safeName = baseName.replace(/[^a-zA-Z0-9_\-]/g, "_"); // sanitise
  const dlName   = `beatzucker_${safeName}_${actualFormat}.${ext}`;

  const commonHeaders = {
    "Content-Type":        mime,
    "Content-Disposition": `attachment; filename="${dlName}"`,
    "Accept-Ranges":       "bytes",
    "Cache-Control":       "private, no-store",
  };

  // Audio previews and large lossless downloads must stream from disk. Reading
  // a 200 MB master into one Buffer per request can exhaust a small production
  // instance under only a handful of concurrent downloads.
  const range = req.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) {
      return new Response("Invalid range", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    let start: number;
    let end: number;
    if (!match[1]) {
      const suffixLength = Number(match[2]);
      if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
        return new Response("Invalid range", { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
      }
      start = Math.max(0, fileSize - suffixLength);
      end = fileSize - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : fileSize - 1;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= fileSize || end < start) {
      return new Response("Invalid range", { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }
    end = Math.min(end, fileSize - 1);
    const length = end - start + 1;
    const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(length),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      ...commonHeaders,
      "Content-Length": String(fileSize),
    },
  });
}
