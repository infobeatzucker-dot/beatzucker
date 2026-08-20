import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { rateLimit } from "@/lib/rateLimit";
import { verifyUpload } from "@/lib/uploadAuthorization";
import { pythonServiceHeaders } from "@/lib/pythonService";

export const maxDuration = 120;

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
const FILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Anmeldung erforderlich" }, { status: 401 });
    if (!rateLimit(`waveform:${session.user.id}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Zu viele Wellenform-Anfragen" }, { status: 429 });
    }

    const fileId = req.nextUrl.searchParams.get("file_id");
    const uploadToken = req.nextUrl.searchParams.get("upload_token");
    if (!fileId || !FILE_ID_PATTERN.test(fileId)) {
      return NextResponse.json({ error: "Ungültige Datei-ID" }, { status: 400 });
    }
    if (!verifyUpload(fileId, session.user.id, uploadToken)) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Upload" }, { status: 403 });
    }

    const files = existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : [];
    const filename = files.find((file) => file.startsWith(`${fileId}.`));
    if (!filename) return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });

    const uploadRoot = path.resolve(UPLOAD_DIR);
    const filePath = path.resolve(path.join(uploadRoot, filename));
    const relative = path.relative(uploadRoot, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return NextResponse.json({ error: "Ungültiger Dateipfad" }, { status: 400 });
    }

    const response = await fetch(`${PYTHON_URL}/waveform`, {
      method: "POST",
      headers: pythonServiceHeaders(),
      body: JSON.stringify({ file_path: filePath, bins: 240 }),
      signal: AbortSignal.timeout(110000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Wellenform konnte nicht erzeugt werden" }, { status: response.status });
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Ungültige Wellenform-Daten" }, { status: 502 });
    }
    const peaks = (payload as { peaks?: unknown }).peaks;
    if (!Array.isArray(peaks) || peaks.length !== 240 || peaks.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)) {
      return NextResponse.json({ error: "Ungültige Wellenform-Daten" }, { status: 502 });
    }

    return NextResponse.json({ peaks }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    console.error("Waveform error:", error);
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json(
      { error: timeout ? "Wellenform-Erstellung hat zu lange gedauert" : "Wellenform-Service nicht erreichbar" },
      { status: timeout ? 504 : 503 },
    );
  }
}
