import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { assertCurrentSession, confirmAccountAction } from "@/lib/accountSecurity";
import { readAuthRequest, authRequestFailure, AuthRequestError } from "@/lib/authRequest";
import { activeDspMasterIds } from "@/lib/dspJobs";
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
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new AuthRequestError("Bitte erneut anmelden. / Please sign in again.", 401);
    const body = await readAuthRequest(req);
    const updates: Prisma.UserUpdateManyMutationInput = {};
    if ("name" in body) {
      if (typeof body.name !== "string") throw new AuthRequestError("Invalid name", 400);
      updates.name = body.name.trim().slice(0, 80);
    }
    if ("twoFactor" in body) {
      if (typeof body.twoFactor !== "boolean") throw new AuthRequestError("Invalid 2FA setting", 400);
      updates.twoFactorEnabled = body.twoFactor;
    }
    if ("newPassword" in body) {
      const password = body.newPassword;
      if (typeof password !== "string" || password.length < 8 || password.length > 128 ||
          !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        throw new AuthRequestError("Password needs 8–128 characters, upper/lowercase and a number. / Passwort: 8–128 Zeichen, Groß-/Kleinbuchstaben und eine Zahl.", 400);
      }
      updates.password = await hashPassword(password);
      updates.passwordChangedAt = new Date();
      updates.passwordResetToken = null;
      updates.passwordResetExpires = null;
      updates.loginOtp = null;
      updates.loginOtpExpires = null;
    }
    if (!Object.keys(updates).length) throw new AuthRequestError("Keine Änderungen / No changes", 400);
    await db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: session.user.id } });
      if (!user) throw new AuthRequestError("Bitte erneut anmelden. / Please sign in again.", 401);
      assertCurrentSession(session, user);
      if ("twoFactor" in body || "newPassword" in body) {
        if (!user.password) throw new AuthRequestError("Only available for password accounts. / Nur für Passwort-Konten verfügbar.", 400);
        await confirmAccountAction(tx, session, user, body);
      }
      await tx.user.update({ where: { id: user.id }, data: updates });
    });
    return NextResponse.json({ ok: true, signInAgain: "newPassword" in body });
  } catch (error) {
    const failure = authRequestFailure(error);
    if (failure) return failure;
    console.error("[account] update failed", error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen. / Saving failed." }, { status: 500 });
  }
}

// ── DELETE /api/account ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new AuthRequestError("Bitte erneut anmelden. / Please sign in again.", 401);
    const body = await readAuthRequest(req);
    // Worker state may outlive a finished/failed database status.
    let active: Set<string>;
    try { active = await activeDspMasterIds(); }
    catch { throw new AuthRequestError("Please try again later: worker state unavailable. / Bitte später erneut versuchen: Bearbeitungsstatus nicht verfügbar.", 503); }
    const masters = await db.$transaction(async tx => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        include: { masters: { select: { id: true, fileId: true, status: true } } },
      });
      if (!user) throw new AuthRequestError("Bitte erneut anmelden. / Please sign in again.", 401);
      await confirmAccountAction(tx, session, user, body);
      if (user.masters.some(m => ["pending", "processing"].includes(m.status) || active.has(m.id))) {
        throw new AuthRequestError("Please wait until mastering has finished. / Bitte warten, bis das Mastering beendet ist.", 409);
      }
      await tx.master.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
      return user.masters;
    });
    // Delete files only after the database transaction succeeds.
    const cleanup = await Promise.allSettled(masters.flatMap(master => [
      removeMasterFiles(master.id, true), removeUploadFiles(master.fileId, true),
    ]));
    const cleanupPending = cleanup.some(result => result.status === "rejected");
    if (cleanupPending) console.error("[account] orphan audio cleanup pending");
    return NextResponse.json({ ok: true, cleanupPending });
  } catch (error) {
    const failure = authRequestFailure(error);
    if (failure) return failure;
    console.error("[account] deletion failed", error);
    return NextResponse.json({ error: "Löschen fehlgeschlagen. / Deletion failed." }, { status: 500 });
  }
}
