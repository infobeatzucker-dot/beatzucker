import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { requireAdmin } from "@/lib/adminAccess";
import { authOptions } from "@/lib/authOptions";
import { authRequestFailure, readAuthRequest } from "@/lib/authRequest";
import { db } from "@/lib/db";

// Keep this setting independent of the existing promo singleton.
const id = "donation-welcome";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const setting = await db.promotion.findUnique({ where: { id }, select: { active: true } });
    return NextResponse.json({ enabled: setting?.active === true }, { headers });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!await requireAdmin(await getServerSession(authOptions))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
    }
    const body = await readAuthRequest(req, "admin:donation-popup");
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid setting" }, { status: 400, headers });
    }
    const value = { active: body.enabled };
    await db.promotion.upsert({
      where: { id },
      update: value,
      create: { id, ...value, title: "Donation popup", body: "First-visit donation popup" },
    });
    return NextResponse.json({ enabled: value.active }, { headers });
  } catch (error) {
    return authRequestFailure(error) ?? NextResponse.json({ error: "Could not save" }, { status: 500, headers });
  }
}
