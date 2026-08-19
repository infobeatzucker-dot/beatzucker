import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimit } from "@/lib/rateLimit";
import { normalizeAnalysis, signAnalysis } from "@/lib/analysisValidation";

// Allow up to 3 minutes – librosa analysis on long tracks can take 60–90s
export const maxDuration = 180;

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Anmeldung erforderlich" }, { status: 401 });
    if (!rateLimit(`analyze:${session.user.id}`, 12, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Zu viele Analysen. Bitte warte einen Moment." }, { status: 429 });
    }

    const { file_id } = await req.json();

    if (typeof file_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(file_id)) {
      return NextResponse.json({ error: "Ungültige Datei-ID" }, { status: 400 });
    }

    // Find the uploaded file
    const files = existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : [];
    const filename = files.find((f) => f.startsWith(`${file_id}.`));

    if (!filename) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const filePath = path.resolve(path.join(UPLOAD_DIR, filename));

    // Call Python analyzer
    const res = await fetch(`${PYTHON_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath }),
      signal: AbortSignal.timeout(170000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Analysis failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const analysis = normalizeAnalysis(await res.json());
    if (!analysis) return NextResponse.json({ error: "Analyseservice lieferte ungültige Messwerte" }, { status: 502 });
    const token = signAnalysis(file_id, analysis);
    if (!token) return NextResponse.json({ error: "Analysesignatur ist nicht konfiguriert" }, { status: 500 });
    return NextResponse.json({ ...analysis, analysis_token: token });
  } catch (err: unknown) {
    console.error("Analyze error:", err);
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return NextResponse.json(
      { error: timeout ? "Analyse hat das Zeitlimit überschritten" : "Analyseservice nicht erreichbar" },
      { status: timeout ? 504 : 503 },
    );
  }
}
