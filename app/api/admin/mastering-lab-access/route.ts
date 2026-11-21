import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { db } from "@/lib/db";
import { labNoStore } from "@/lib/masteringLab";

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(await getServerSession(authOptions))) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { userId, enabled } = await readAuthRequest(req, "admin:mastering-lab");
    if (typeof userId !== "string" || !userId || userId.length > 128 || typeof enabled !== "boolean")
      return Response.json({ error: "Invalid permission" }, { status: 400 });
    const found = await db.$transaction(async tx => {
      if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) return false;
      const where = { userId };
      if (enabled) await tx.masteringLabAccess.upsert({ where, create: where, update: {} });
      else await tx.masteringLabAccess.deleteMany({ where });
      return true;
    });
    return Response.json(found ? { enabled } : { error: "User not found" }, { status: found ? 200 : 404, headers: labNoStore });
  } catch (error) {
    return authRequestFailure(error) ?? Response.json({ error: "Could not save permission" }, { status: 500 });
  }
}
