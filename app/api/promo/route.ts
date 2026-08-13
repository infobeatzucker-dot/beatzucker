import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const promo = await db.promotion.findUnique({ where: { id: "singleton" } });
  if (!promo || !promo.active) return NextResponse.json(null);
  if (promo.expiresAt && promo.expiresAt < new Date()) return NextResponse.json(null);
  return NextResponse.json(promo);
}
