import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { requireAdmin } from "@/lib/adminAccess";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { dailyMasterLimit, startOfMasteringDay } from "@/lib/masterQuota";
import type { Prisma } from "@prisma/client";
import { activeDspMasterIds } from "@/lib/dspJobs";
import { removeMasterFiles, removeUploadFiles } from "@/lib/storage";

// GET /api/admin — returns full dashboard data
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!await requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0,120);
  const requested = Number(req.nextUrl.searchParams.get("page"));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 10000) : 1;
  const pageSize = 50;
  const userFilter: Prisma.UserWhereInput = search ? {OR:[{email:{contains:search}},{name:{contains:search}}]} : {};
  const day = startOfMasteringDay();
  const [
    totalUsers,
    totalMasters,
    totalLabRenders,
    studioCompleted,
    recentMasters,
    recentLabRenders,
    users,
    promo,
    matchingUsers,
  ] = await Promise.all([
    db.user.count(),
    db.master.count(),
    db.labRender.count(),
    db.master.count({where:{workspace:"studio",status:"done"}}),
    db.master.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, originalName: true, platform: true, status: true, workspace:true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    db.labRender.findMany({orderBy:{completedAt:"desc"},take:20,select:{id:true,originalName:true,format:true,targetLufs:true,completedAt:true,user:{select:{email:true}}}}),
    db.user.findMany({
      where: userFilter,
      orderBy: [{createdAt:"desc"},{id:"desc"}],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, email: true, name: true, createdAt: true, dailyMasterLimit: true,
        vocalRemoverEnabled: true, stemSeparationEnabled: true, lastSeenAt: true, lastMasteredAt: true,
        masteringLabAccess: { select: { userId: true } },
        _count: { select: { masters: true, labRenders:true } },
      },
    }),
    db.promotion.findUnique({ where: { id: "singleton" } }),
    db.user.count({where:userFilter}),
  ]);

  const visibleIds = users.map(user=>user.id);
  const [quotaUsage, chargedUsage] = await Promise.all([
    db.master.groupBy({ by: ["userId"], where: { userId:{in:visibleIds}, status:{in:["done","processing"]}, createdAt:{gte:day}, dailyCharge:{is:null} }, _count:{_all:true} }),
    db.dailyMasterCharge.groupBy({ by: ["userId"], where: { userId:{in:visibleIds}, day:{gte:day}, OR:[{masterId:null},{master:{status:{in:["done","processing"]}}}] }, _count:{_all:true} }),
  ]);
  const quotaByUser = new Map(quotaUsage.map(usage => [usage.userId, usage._count._all]));
  const hasHistoricalMasters = users.some(user => !user.lastMasteredAt && user._count.masters > 0);
  const historicalMasters = hasHistoricalMasters ? await db.master.groupBy({
    by: ["userId"],
    where: { userId:{in:visibleIds}, user: { is: { lastMasteredAt: null } }, status: "done" },
    _max: { createdAt: true, completedAt: true },
  }) : [];
  const historicalLastMaster = new Map<string, Date>();
  for (const master of historicalMasters) {
    const { completedAt, createdAt } = master._max;
    const date = completedAt && (!createdAt || completedAt >= createdAt) ? completedAt : createdAt;
    if (date && master.userId) historicalLastMaster.set(master.userId, date);
  }
  for (const usage of chargedUsage) quotaByUser.set(usage.userId, (quotaByUser.get(usage.userId) ?? 0) + usage._count._all);
  // Python service health check
  const pythonUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
  let pythonStatus: "ok" | "down" = "down";
  try {
    const res = await fetch(`${pythonUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) pythonStatus = "ok";
  } catch { /* service unreachable */ }

  // Masters today
  const [mastersToday, labRendersToday, masterErrors] = await Promise.all([
    db.master.count({ where: { createdAt: { gte: day } } }),
    db.labRender.count({where:{completedAt:{gte:day}}}),
    db.master.count({ where: { status: "error" } }),
  ]);

  return NextResponse.json({
    promo: promo ?? null,
    pagination:{page,pageSize,total:matchingUsers},
    stats: {
      totalUsers,
      totalMasters:totalMasters+totalLabRenders,
      mastersToday:mastersToday+labRendersToday,
      labCompleted:totalLabRenders,
      studioCompleted,
      masterErrors,
      pythonStatus,
    },
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
      lastMasteredAt: u.lastMasteredAt ?? historicalLastMaster.get(u.id) ?? null,
      mastersCount: u._count.masters+u._count.labRenders,
      labMastersCount:u._count.labRenders,
      dailyMasterLimit: u.dailyMasterLimit,
      vocalRemoverEnabled: u.vocalRemoverEnabled,
      stemSeparationEnabled: u.stemSeparationEnabled,
      masteringLabEnabled: Boolean(u.masteringLabAccess),
      dailyLimit: dailyMasterLimit(u.dailyMasterLimit),
      dailyUsed: quotaByUser.get(u.id) ?? 0,
    })),
    recentMasters: [...recentMasters.map(m => ({
      id: m.id,
      originalName: m.originalName,
      platform: m.platform,
      status: m.status,
      createdAt: m.createdAt,
      userEmail: m.user?.email ?? "—",
      workspace:m.workspace??"legacy",
    })),...recentLabRenders.map(m=>({id:m.id,originalName:m.originalName,
      platform:m.targetLufs===null?m.format:`${m.targetLufs} LUFS`,status:"done",createdAt:m.completedAt,userEmail:m.user.email,workspace:"lab",
    }))].sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime()).slice(0,20),
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
    if (Buffer.byteLength(newPassword, "utf8") > 72) {
      return NextResponse.json({ error: "Passwort darf höchstens 72 UTF-8-Bytes umfassen. / Password may contain at most 72 UTF-8 bytes." }, { status: 400 });
    }
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
      data: { password: hashed, passwordChangedAt: new Date(), passwordResetToken: null, passwordResetExpires: null, loginOtp: null, loginOtpExpires: null },
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
  if (session?.user.id === userId) return NextResponse.json({error:"Use account settings to delete your own account."},{status:409});
  let active: Set<string>;
  try { active=await activeDspMasterIds(); } catch { return NextResponse.json({error:"Processing status unavailable"},{status:503}); }
  const owned=await db.$transaction(async tx=>{
    const account=await tx.user.findUnique({where:{id:userId},select:{masters:{select:{id:true,fileId:true,status:true}},temporaryUploads:{select:{id:true}}}});
    if (!account || account.masters.some(master=>["pending","processing"].includes(master.status)||active.has(master.id))) return account ? "active" : null;
    await tx.master.deleteMany({where:{userId}});
    await tx.user.delete({where:{id:userId}});
    return account;
  });
  if (!owned) return NextResponse.json({error:"Account not found"},{status:404});
  if (owned==="active") return NextResponse.json({error:"Mastering still running"},{status:409});
  const ids=new Set([...owned.masters.map(master=>master.fileId),...owned.temporaryUploads.map(upload=>upload.id)]);
  const cleanup=await Promise.allSettled([...owned.masters.map(master=>removeMasterFiles(master.id,true)),...Array.from(ids,id=>removeUploadFiles(id,true))]);
  const cleanupPending=cleanup.some(item=>item.status==="rejected");
  if (cleanupPending) console.warn("[admin] orphan audio cleanup pending");

  return NextResponse.json({ ok: true, cleanupPending });
}
