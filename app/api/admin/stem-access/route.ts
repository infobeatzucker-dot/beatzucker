import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(await getServerSession(authOptions))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await readAuthRequest(req);
    if (typeof body.userId !== "string" || body.userId.length > 128 || typeof body.vocalRemoverEnabled !== "boolean" || typeof body.stemSeparationEnabled !== "boolean") return NextResponse.json({ error: "Invalid permissions" }, { status: 400 });
    const data = { vocalRemoverEnabled: body.vocalRemoverEnabled, stemSeparationEnabled: body.stemSeparationEnabled };
    const result = await db.user.updateMany({ where: { id: body.userId }, data });
    return NextResponse.json(result.count ? { ok: true, ...data } : { error: "Not found" }, { status: result.count ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authRequestFailure(error) ?? NextResponse.json({ error: "Could not save permissions" }, { status: 500 }); }
}
