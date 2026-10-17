import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { removeMasterFiles } from "@/lib/storage";
import { startOfMasteringDay } from "@/lib/masterQuota";

// PATCH /api/master/:id — update notes for a master
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { notes } = await req.json();
  if (typeof notes !== "string")
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 });

  // Verify ownership
  const master = await db.master.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!master || master.userId !== session.user.id)
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  await db.master.update({
    where: { id },
    data: { notes: notes.trim().slice(0, 500) },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/master/:id — remove a master entry from history
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const result = await db.$transaction(async tx => {
    const master = await tx.master.findUnique({ where: { id }, select: { userId: true, status: true, createdAt: true } });
    if (!master || master.userId !== session.user.id) return 404;
    if (["pending", "processing"].includes(master.status)) return 409;
    if (master.status === "done" && master.createdAt >= startOfMasteringDay()) {
      await tx.dailyMasterCharge.upsert({ where: { id }, update: {}, create: { id, masterId: id, userId: session.user.id, day: startOfMasteringDay(master.createdAt) } });
    } else if (master.status !== "done") {
      await tx.dailyMasterCharge.deleteMany({ where: { masterId: id } });
    }
    await tx.master.delete({ where: { id } });
    return 200;
  });
  if (result !== 200) return NextResponse.json({ error: result === 409 ? "Bitte laufendes Mastering abwarten. / Please wait for mastering to finish." : "Nicht gefunden / Not found" }, { status: result });
  await removeMasterFiles(id);
  return NextResponse.json({ ok: true });
}
