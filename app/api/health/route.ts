import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const response = await fetch(`${process.env.PYTHON_SERVICE_URL ?? "http://localhost:8001"}/health`, {
      cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    const payload = await response.json();
    if (!response.ok || payload.status !== "ok") throw new Error("DSP unavailable");
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
