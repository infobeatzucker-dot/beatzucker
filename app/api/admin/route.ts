import { NextRequest, NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

function isAdmin(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

async function requireAdmin(session: Session | null) {
  if (!session?.user?.email || !isAdmin(session.user.email)) return false;
  const adminUser = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  return !!adminUser;
}

// GET /api/admin — returns full dashboard data
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!await requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    totalMasters,
    recentMasters,
    users,
    promo,
  ] = await Promise.all([
    db.user.count(),
    db.master.count(),
    db.master.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, originalName: true, platform: true, status: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { masters: true } },
      },
    }),
    db.promotion.findUnique({ where: { id: "singleton" } }),
  ]);

  // Python service health check
  const pythonUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
  let pythonStatus: "ok" | "down" = "down";
  try {
    const res = await fetch(`${pythonUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) pythonStatus = "ok";
  } catch { /* service unreachable */ }

  // Masters today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [mastersToday, masterErrors] = await Promise.all([
    db.master.count({ where: { createdAt: { gte: startOfDay } } }),
    db.master.count({ where: { status: "error" } }),
  ]);

  return NextResponse.json({
    promo: promo ?? null,
    stats: {
      totalUsers,
      totalMasters,
      mastersToday,
      masterErrors,
      pythonStatus,
    },
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      mastersCount: u._count.masters,
    })),
    recentMasters: recentMasters.map(m => ({
      id: m.id,
      originalName: m.originalName,
      platform: m.platform,
      status: m.status,
      createdAt: m.createdAt,
      userEmail: m.user?.email ?? "—",
    })),
  });
}

// PATCH /api/admin — credits or promo actions
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!await requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  // --- Action: upsert promo popup ---
  if (action === "promo") {
    const { active, title, body: bodyText, ctaText, ctaUrl, bgStyle, expiresAt } = body as {
      active: boolean; title: string; body: string;
      ctaText?: string; ctaUrl?: string; bgStyle: string; expiresAt?: string;
    };
    if (typeof active !== "boolean" || !title?.trim() || !bodyText?.trim()) {
      return NextResponse.json({ error: "Titel und Text sind erforderlich" }, { status: 400 });
    }
    const promo = await db.promotion.upsert({
      where: { id: "singleton" },
      update: {
        active, title: title.trim(), body: bodyText.trim(),
        ctaText: ctaText?.trim() || null,
        ctaUrl: ctaUrl?.trim() || null,
        bgStyle: bgStyle || "purple",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: new Date(),
      },
      create: {
        id: "singleton",
        active, title: title.trim(), body: bodyText.trim(),
        ctaText: ctaText?.trim() || null,
        ctaUrl: ctaUrl?.trim() || null,
        bgStyle: bgStyle || "purple",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    return NextResponse.json({ ok: true, promo });
  }

  // --- Action: reset admin's own password ---
  if (action === "reset-admin-password") {
    const { newPassword } = body as { newPassword: string };
    if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: "Passwort muss 8–128 Zeichen lang sein" }, { status: 400 });
    }
    const adminUser = await db.user.findUnique({
      where: { email: session!.user!.email! },
    });
    if (!adminUser) return NextResponse.json({ error: "Admin-User nicht gefunden" }, { status: 404 });

    const hashed = await hashPassword(newPassword);
    await db.user.update({
      where: { id: adminUser.id },
      data: { password: hashed },
    });
    console.log(`[admin] password reset for ${adminUser.email}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Action" }, { status: 400 });
}

// DELETE /api/admin?userId=xxx — delete a user
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!await requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await db.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
