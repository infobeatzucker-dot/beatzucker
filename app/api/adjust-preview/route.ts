import { NextRequest } from "next/server";
import path from "path";
import { existsSync, statSync } from "fs";
import { readdir, readFile, unlink } from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimit } from "@/lib/rateLimit";

// Ein Ausschnitt braucht wenige Sekunden statt Minuten — trotzdem großzügig
// puffern, damit ein kalter Python-Worker den Aufruf nicht abbricht.
export const maxDuration = 120;

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
const SEGMENT_TTL_MS = 30 * 60 * 1000;

/**
 * Vorhör-Schnipsel bekommen bewusst KEINEN Master-Datensatz in der Datenbank:
 * sie sind Wegwerf-Material während der Justage und hätten in der Historie des
 * Nutzers nichts verloren. Damit greift aber auch die Besitzprüfung von
 * /api/download nicht, die genau auf diesem Datensatz aufbaut — deshalb hier
 * eine eigene, kurzlebige Zuordnung Segment→Nutzer.
 *
 * In-Memory ist hier vertretbar: die App läuft als einzelner Node-Prozess im
 * Container (gleiches Muster wie lib/rateLimit), und ein Neustart macht
 * höchstens ein paar Vorhör-Schnipsel unerreichbar, die ohnehin verfallen.
 */
type SegmentOwner = { userId: string; expiresAt: number };
const segmentOwners: Map<string, SegmentOwner> =
  (globalThis as { __bzSegments?: Map<string, SegmentOwner> }).__bzSegments ??
  ((globalThis as { __bzSegments?: Map<string, SegmentOwner> }).__bzSegments = new Map());

const SEG_ID = /^seg_[a-f0-9]{12}$/;

/** Abgelaufene Schnipsel samt Dateien entfernen — spart einen eigenen Cronjob. */
async function sweepExpired() {
  const now = Date.now();
  for (const [id, meta] of segmentOwners) {
    if (meta.expiresAt > now) continue;
    segmentOwners.delete(id);
    const p = path.join(UPLOAD_DIR, "masters", `${id}_mp3128.mp3`);
    if (existsSync(p)) await unlink(p).catch(() => {});
  }
}

/**
 * Rendert einen markierten Ausschnitt mit den aktuell eingestellten Parametern
 * durch die echte Mastering-Kette — das Gegenstück zur schnellen, aber nur
 * angenäherten Web-Audio-Vorschau im Browser.
 *
 * Zählt bewusst NICHT auf das Tageslimit: das sind Vorhör-Schnipsel während der
 * Justage, keine fertigen Masters. Stattdessen greift ein eigenes Rate-Limit.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return Response.json({ error: "Anmeldung erforderlich" }, { status: 401 });
  }

  // Vorhören ist billig, aber nicht gratis — 20 Ausschnitte pro Minute reichen
  // für flüssiges Arbeiten und verhindern, dass jemand die Queue flutet.
  if (!rateLimit(`adjust-preview:${userId}`, 20, 60 * 1000)) {
    return Response.json(
      { error: "Zu viele Vorhör-Anfragen. Bitte kurz warten." },
      { status: 429 },
    );
  }

  await sweepExpired();

  const body = await req.json().catch(() => ({}));
  const fileId = body.file_id as string | undefined;
  if (!fileId) return Response.json({ error: "file_id required" }, { status: 400 });
  if (fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
    return Response.json({ error: "Invalid file_id" }, { status: 400 });
  }

  const files = existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : [];
  const filename = files.find((f) => f.startsWith(fileId));
  if (!filename) return Response.json({ error: "Datei nicht gefunden" }, { status: 404 });

  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));
  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  const startSec = Math.max(0, Number(body.start_sec ?? 0));
  const endSec = Math.max(startSec + 1, Number(body.end_sec ?? startSec + 10));

  try {
    const res = await fetch(`${PYTHON_URL}/preview_segment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_path: filePath,
        start_sec: startSec,
        end_sec: endSec,
        platform: (body.platform as string) || "spotify",
        preset: (body.preset as string) || "auto",
        intensity: Math.min(100, Math.max(0, Number(body.intensity ?? 65))),
        output_dir: path.resolve(path.join(UPLOAD_DIR, "masters")),
        ...(body.analysis ? { analysis: body.analysis } : {}),
        ...(body.reference_analysis ? { reference_analysis: body.reference_analysis } : {}),
        ...(body.overrides ? { overrides: body.overrides } : {}),
      }),
      signal: AbortSignal.timeout(110000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("preview_segment failed:", res.status, detail);
      return Response.json(
        { error: "Vorhören fehlgeschlagen. Versuche es noch einmal." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      master_id?: string;
      post_analysis?: Record<string, unknown>;
    };
    if (!data.master_id || !SEG_ID.test(data.master_id)) {
      return Response.json({ error: "Vorhören lieferte kein Ergebnis" }, { status: 502 });
    }

    segmentOwners.set(data.master_id, { userId, expiresAt: Date.now() + SEGMENT_TTL_MS });

    return Response.json({
      segment_id: data.master_id,
      url: `/api/adjust-preview?id=${data.master_id}`,
      post_analysis: data.post_analysis ?? null,
      start_sec: startSec,
      end_sec: endSec,
    });
  } catch (err) {
    console.error("adjust-preview error:", err);
    return Response.json(
      { error: "Vorhören fehlgeschlagen. Versuche es noch einmal." },
      { status: 500 },
    );
  }
}

/** Liefert den gerenderten Ausschnitt aus — nur an den Nutzer, der ihn erzeugt hat. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !SEG_ID.test(id)) {
    return Response.json({ error: "Ungültige Segment-ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const owner = segmentOwners.get(id);
  if (!owner || owner.expiresAt < Date.now()) {
    return Response.json({ error: "Vorhör-Ausschnitt abgelaufen" }, { status: 404 });
  }
  if (owner.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = path.join(UPLOAD_DIR, "masters", `${id}_mp3128.mp3`);
  if (!existsSync(filePath)) {
    return Response.json({ error: "Vorhör-Ausschnitt nicht gefunden" }, { status: 404 });
  }

  const size = statSync(filePath).size;
  const buffer = await readFile(filePath);

  // Range-Support, damit der Browser im Ausschnitt springen und loopen kann
  const range = req.headers.get("range");
  if (range) {
    const [s, e] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(s, 10) || 0;
    const end = e ? parseInt(e, 10) : size - 1;
    return new Response(buffer.subarray(start, end + 1), {
      status: 206,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    },
  });
}
