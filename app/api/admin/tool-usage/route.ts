import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { db } from "@/lib/db";
import { cleanupToolUsage, usageCutoff, usageDay } from "@/lib/toolUsage";

export async function GET(request: Request) {
  if (!await requireAdmin(await getServerSession(authOptions))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const days = Number(new URL(request.url).searchParams.get("days") || 30);
  if (![7, 30, 90].includes(days)) return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  try {
    await cleanupToolUsage();
    const rows = await db.toolUsage.groupBy({ by: ["day", "tool", "outcome"], where: { day: { gte: usageCutoff(days), lte: usageDay() } }, _count: { _all: true } });
    return NextResponse.json({ days, today: usageDay(), rows: rows.map(row => ({ day: row.day, tool: row.tool, outcome: row.outcome, count: row._count._all })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Statistik momentan nicht verfügbar." }, { status: 503 });
  }
}
