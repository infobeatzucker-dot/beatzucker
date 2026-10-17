import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { db } from "@/lib/db";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { dailyMasterLimit, validDailyMasterLimit } from "@/lib/masterQuota";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!await requireAdmin(session)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await readAuthRequest(request);
    if (typeof body.userId !== "string" || !body.userId || body.userId.length > 128 || !validDailyMasterLimit(body.dailyMasterLimit)) {
      return Response.json({ error: "Bitte ein Tageslimit von 0 bis 1000 oder Standard wählen. / Choose a daily limit from 0 to 1000 or the default." }, { status: 400 });
    }
    // Only the quota field is writable here, never permissions or account secrets.
    const updated = await db.user.updateMany({ where: { id: body.userId }, data: { dailyMasterLimit: body.dailyMasterLimit } });
    if (!updated.count) return Response.json({ error: "Nutzer nicht gefunden. / User not found." }, { status: 404 });
    console.info("[admin] daily master limit changed", { actorId: session!.user?.id, userId: body.userId, dailyMasterLimit: body.dailyMasterLimit });
    return Response.json({ ok: true, userId: body.userId, dailyMasterLimit: body.dailyMasterLimit, dailyLimit: dailyMasterLimit(body.dailyMasterLimit) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = authRequestFailure(error);
    if (failure) return failure;
    console.error("[admin] daily master limit update failed");
    return Response.json({ error: "Speichern fehlgeschlagen. Bitte erneut versuchen. / Could not save. Please retry." }, { status: 500 });
  }
}
