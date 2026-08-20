import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { DAILY_MASTER_LIMIT, DOWNLOAD_WINDOW_MS } from "@/lib/constants";
import { findExistingMasterFormats, removeMasterFiles, removeUploadFiles } from "@/lib/storage";

// ── GET /api/account ─────────────────────────────────────────────────
// Returns user profile + usage stats + master history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      masters: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, originalName: true, platform: true, preset: true,
          status: true, preAnalysis: true, postAnalysis: true, createdAt: true, completedAt: true, notes: true,
          aiParams: true,
          pathWav32: true, pathWav24: true, pathWav16: true, pathFlac: true,
          pathMp3320: true, pathMp3128: true, pathAac256: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  // Fair-use daily counter
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dailyUsed = await db.master.count({
    where: {
      userId: user.id,
      status: { in: ["done", "processing"] },
      createdAt: { gte: startOfDay },
    },
  });

  // Parse LUFS from analysis JSON
  const now = Date.now();
  const mastersWithLufs = user.masters.map((m: typeof user.masters[number]) => {
    let lufsIn = null, lufsOut = null;
    try { const pre = JSON.parse(m.preAnalysis ?? "{}"); lufsIn = pre.integrated_lufs ?? pre.integrated_loudness ?? null; } catch {}
    try { const post = JSON.parse(m.postAnalysis ?? "{}"); lufsOut = post.integrated_lufs ?? post.integrated_loudness ?? null; } catch {}
    const completionDate = m.completedAt ?? m.createdAt;
    const expiresAt = m.status === "done"
      ? new Date(completionDate.getTime() + DOWNLOAD_WINDOW_MS)
      : null;
    const withinWindow = expiresAt !== null && expiresAt.getTime() > now;
    // Disk is the source of truth for local storage. A persisted path must not
    // make an already-cleaned or partially-created file appear downloadable.
    const formats = m.status === "done" && withinWindow ? findExistingMasterFormats(m.id) : [];
    let selectedFormat: string | null = null;
    try {
      const saved = JSON.parse(m.aiParams ?? "{}");
      if (typeof saved.selectedFormat === "string") selectedFormat = saved.selectedFormat;
    } catch {}
    return { id: m.id, originalName: m.originalName, platform: m.platform,
             preset: m.preset, status: m.status, lufsIn, lufsOut,
             createdAt: m.createdAt, completedAt: m.completedAt,
             expiresAt, downloadAvailable: formats.length > 0 && withinWindow,
             notes: m.notes ?? "", formats, selectedFormat };
  });

  const savedRefs = await db.savedReference.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, analysisJson: true, createdAt: true },
  });

  return NextResponse.json({
    user: {
      id:    user.id,
      email: user.email,
      name:  user.name,
      image: user.image,
      hasPassword: !!user.password,
      createdAt: user.createdAt,
    },
    twoFactor:      user.twoFactorEnabled,
    dailyUsed,
    dailyLimit:     DAILY_MASTER_LIMIT,
    masters:        mastersWithLufs,
    savedRefs,
    savedRefsLimit: 100,
  });
}

// ── PATCH /api/account ───────────────────────────────────────────────
// Update name or change password
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const body = await req.json();
  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  const updates: Record<string, string | boolean> = {};

  // Update name
  if (typeof body.name === "string") {
    updates.name = body.name.trim().slice(0, 80);
  }

  // Toggle 2FA — requires current password confirmation to enable
  if (typeof body.twoFactor === "boolean") {
    if (!user.password)
      return NextResponse.json({ error: "2FA nur für Passwort-Konten verfügbar" }, { status: 400 });
    if (body.twoFactor && !body.currentPassword)
      return NextResponse.json({ error: "Aktuelles Passwort erforderlich um 2FA zu aktivieren" }, { status: 400 });
    if (body.twoFactor) {
      const valid = await verifyPassword(body.currentPassword, user.password);
      if (!valid)
        return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 400 });
    }
    console.log(`[2fa] ${user.email} toggled twoFactorEnabled: ${user.twoFactorEnabled} → ${body.twoFactor}`);
    updates.twoFactorEnabled = body.twoFactor;
  }

  // Change password
  if (body.currentPassword && body.newPassword) {
    if (!user.password)
      return NextResponse.json({ error: "Kein Passwort-Login (Google-Konto)" }, { status: 400 });
    const valid = await verifyPassword(body.currentPassword, user.password);
    if (!valid)
      return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 400 });
    if (body.newPassword.length < 8 || !/[A-Z]/.test(body.newPassword) || !/[a-z]/.test(body.newPassword) || !/[0-9]/.test(body.newPassword))
      return NextResponse.json({ error: "Passwort muss mind. 8 Zeichen, Groß-/Kleinbuchstaben und eine Zahl enthalten" }, { status: 400 });
    updates.password = await hashPassword(body.newPassword);
    updates.passwordChangedAt = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });

  await db.user.update({ where: { id: user.id }, data: updates });
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/account ──────────────────────────────────────────────
// Delete account + all data (DSGVO Art. 17)
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: { masters: { select: { id: true, fileId: true } } },
  });
  if (!user) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  // Cascade deletes handle database records; audio files live outside Prisma
  // and must be removed explicitly for account deletion to be complete.
  await Promise.all(user.masters.flatMap((master) => [
    removeMasterFiles(master.id),
    removeUploadFiles(master.fileId),
  ]));
  await db.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true });
}
