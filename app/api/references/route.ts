import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const REQUIRED_FIELDS = [
  "integrated_lufs", "true_peak", "spectral_centroid",
  "spectral_rolloff", "spectral_flatness",
  "rms_sub", "rms_low", "rms_mid", "rms_high", "rms_air",
];
const OPTIONAL_FIELDS = ["stereo_width", "mono_compatibility", "lra", "crest_factor", "transient_density"];

const REF_LIMIT = 100;

async function getAuthedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user ?? null;
}

// GET /api/references — list saved references for the authed user
export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const refs = await db.savedReference.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, analysisJson: true, createdAt: true },
  });

  return NextResponse.json({ refs, limit: REF_LIMIT, count: refs.length });
}

// POST /api/references — save a new reference analysis
export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, analysis } = body as { name?: string; analysis?: Record<string, unknown> };

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
  }
  const safeName = name.trim().slice(0, 120);

  // Validate analysis fields
  if (!analysis || typeof analysis !== "object") {
    return NextResponse.json({ error: "Analysedaten fehlen" }, { status: 400 });
  }
  for (const field of REQUIRED_FIELDS) {
    if (typeof analysis[field] !== "number" || !Number.isFinite(analysis[field])) {
      return NextResponse.json({ error: `Feld fehlt: ${field}` }, { status: 400 });
    }
  }

  // Check limit
  const count = await db.savedReference.count({ where: { userId: user.id } });
  if (count >= REF_LIMIT) {
    return NextResponse.json({
      error: `Limit erreicht (${REF_LIMIT} Referenz-Tracks). Bitte zuerst einen löschen.`,
    }, { status: 400 });
  }

  // Store the tonal core plus optional dynamics/stereo values used by matching.
  const safeAnalysis: Record<string, number> = {};
  for (const field of REQUIRED_FIELDS) {
    safeAnalysis[field] = analysis[field] as number;
  }
  for (const field of OPTIONAL_FIELDS) {
    const value = analysis[field];
    if (typeof value === "number" && Number.isFinite(value)) safeAnalysis[field] = value;
  }

  const ref = await db.savedReference.create({
    data: {
      userId: user.id,
      name: safeName,
      analysisJson: JSON.stringify(safeAnalysis),
    },
    select: { id: true, name: true, analysisJson: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, ref });
}

// DELETE /api/references?id=xxx — delete a saved reference
export async function DELETE(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

  // Ownership check via userId in where clause
  const deleted = await db.savedReference.deleteMany({
    where: { id, userId: user.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
