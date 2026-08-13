import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// GET /api/account/export
// DSGVO Art. 20 — returns all user data as a downloadable JSON file
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      masters: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, originalName: true, platform: true, preset: true,
          status: true, preAnalysis: true, postAnalysis: true, createdAt: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      createdAt: user.createdAt,
    },
    masters: user.masters,
  };

  const json = JSON.stringify(exportData, null, 2);
  const filename = `upmado-daten-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
