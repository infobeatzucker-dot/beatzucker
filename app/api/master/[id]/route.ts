import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { removeMasterFiles } from "@/lib/storage";

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

  // Verify ownership
  const master = await db.master.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!master || master.userId !== session.user.id)
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  await db.master.delete({ where: { id } });
  await removeMasterFiles(id);
  return NextResponse.json({ ok: true });
}
