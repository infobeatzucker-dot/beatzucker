import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { DOWNLOAD_WINDOW_MS } from "@/lib/constants";

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
    select: { userId: true, createdAt: true, originalName: true },
  });
  if (!masterRecord) {
    return NextResponse.json({ error: "Master nicht gefunden." }, { status: 404 });
  }
  if (masterRecord.userId && masterRecord.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Download time-window check ─────────────────────────────────────────────
  const expiresAt = new Date(masterRecord.createdAt.getTime() + DOWNLOAD_WINDOW_MS);
  if (new Date() > expiresAt) {
    return NextResponse.json({
      error: `Download-Fenster abgelaufen (${DOWNLOAD_WINDOW_MS / 3600000}h).`,
    }, { status: 403 });
  }

  // ── Serve file ────────────────────────────────────────────────────────────
  const actualFormat = format;
  const filePath = path.join(UPLOAD_DIR, "masters", `${masterId}_${format}.${FORMAT_EXT[format]}`);

  if (!existsSync(filePath)) {
    return NextResponse.json({
      error: "Dieses Format wurde nicht erzeugt oder ist abgelaufen.",
    }, { status: 404 });
  }

  const ext        = FORMAT_EXT[actualFormat] || "mp3";
  const fileBuffer = await readFile(filePath);
  const mime       = FORMAT_MIME[actualFormat] || "audio/mpeg";

  // Build download filename: beatzucker_songname_format.ext
  const rawName  = masterRecord.originalName ?? masterId;
  const baseName = rawName.replace(/\.[^/.]+$/, "");          // strip extension
  const safeName = baseName.replace(/[^a-zA-Z0-9_\-]/g, "_"); // sanitise
  const dlName   = `beatzucker_${safeName}_${actualFormat}.${ext}`;

  return new Response(fileBuffer, {
    headers: {
      "Content-Type":        mime,
      "Content-Disposition": `attachment; filename="${dlName}"`,
      "Content-Length":      String(fileBuffer.length),
      "Cache-Control":       "private, no-store",
    },
  });
}
