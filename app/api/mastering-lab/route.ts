import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { labGenres, labNoStore, labTargets } from "@/lib/masteringLab";
import { normalizeAnalysis, verifyAnalysis } from "@/lib/analysisValidation";
import { verifyUpload } from "@/lib/uploadAuthorization";
import { readBoundedJson, JsonBodyError } from "@/lib/boundedJson";
import { rateLimit } from "@/lib/rateLimit";
import { pythonServiceHeaders } from "@/lib/pythonService";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const enabled = userId ? await db.masteringLabAccess.findUnique({ where: { userId }, select: { grantedAt: true } }) : null;
  return Response.json({ signedIn: Boolean(userId), enabled: Boolean(enabled) }, { headers: labNoStore });
}

export async function POST(req: Request) {
  const userId = (await getServerSession(authOptions))?.user?.id;
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(`lab-profile:${userId}`, 10, 60_000))
    return Response.json({ error: "Too many requests" }, { status: 429 });
  try {
    const body = await readBoundedJson(req, 20000);
    const { fileId, uploadToken, analysisToken, platform, preset, intensity, target } = body;
    const analysis = normalizeAnalysis(body.analysis);
    if (typeof fileId !== "string" || !verifyUpload(fileId, userId, uploadToken) || !analysis || !verifyAnalysis(fileId, analysis, analysisToken))
      return Response.json({ error: "Valid signed track analysis required" }, { status: 400 });
    if (!labTargets.some(key => key === platform) || !labGenres.some(key => key === preset) ||
      typeof intensity !== "number" || !Number.isInteger(intensity) || intensity < 0 || intensity > 100 ||
      (platform === "custom" && (typeof target !== "number" || !Number.isFinite(target) || target < -23 || target > -6)))
      return Response.json({ error: "Invalid profile settings" }, { status: 400 });
    const response = await fetch(`${process.env.PYTHON_SERVICE_URL ?? "http://localhost:8001"}/mastering-lab/profile`, {
      method: "POST", headers: pythonServiceHeaders(), signal: AbortSignal.any([req.signal, AbortSignal.timeout(12000)]),
      body: JSON.stringify({ analysis, platform, preset, intensity, target_lufs: platform === "custom" ? target : null }),
    });
    if (!response.ok) return Response.json({ error: "Profile unavailable" }, { status: 503 });
    return Response.json(await response.json(), { headers: labNoStore });
  } catch (error) {
    return Response.json({ error: "Profile unavailable" }, { status: error instanceof JsonBodyError ? error.status : 503 });
  }
}
