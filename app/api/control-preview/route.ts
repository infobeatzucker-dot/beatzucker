import { NextRequest } from "next/server";
import { readdir, realpath } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { verifyUpload } from "@/lib/uploadAuthorization";
import { normalizeAnalysis, normalizeReferenceAnalysis, verifyAnalysis } from "@/lib/analysisValidation";
import { normalizeParamOverrides } from "@/lib/masteringParams";
import { readBoundedJson, JsonBodyError } from "@/lib/boundedJson";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 60;
const platforms = new Set(["spotify", "apple", "youtube", "club", "tidal", "amazon", "deezer", "tiktok", "soundcloud", "broadcast", "custom"]);
const presets = new Set(["auto", "electronic", "hiphop", "rock", "pop", "jazz", "classical", "podcast", "metal", "rnb", "ambient", "lofi", "country", "trap", "latin", "dance", "techno", "edm"]);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } })) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || "https://beatzucker.de").origin) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(`control-preview:${session.user.id}`, 3, 60000) || !rateLimit("control-preview:global", 20, 60000)) return Response.json({ error: "Please wait before rendering another section" }, { status: 429 });
  try {
    const body = await readBoundedJson(request, 16384);
    const id = typeof body.file_id === "string" ? body.file_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "Invalid upload" }, { status: 400 });
    if (!verifyUpload(id, session.user.id, body.upload_token)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const analysis = normalizeAnalysis(body.analysis);
    const token = body.analysis && typeof body.analysis === "object" ? (body.analysis as Record<string, unknown>).analysis_token : undefined;
    const overrides = normalizeParamOverrides(body.overrides);
    const reference = body.reference_analysis == null ? undefined : normalizeReferenceAnalysis(body.reference_analysis);
    const { start, end, intensity, platform, preset, target_lufs: target } = body;
    const character=body.character===undefined?.5:body.character;
    if(typeof character!=="number"||!Number.isFinite(character)||character<0||character>1)return Response.json({error:"Invalid character"},{status:400});
    if (!analysis || !verifyAnalysis(id, analysis, token) || !overrides || reference === null || !platforms.has(String(platform)) || !presets.has(String(preset))
      || typeof intensity !== "number" || !Number.isFinite(intensity) || intensity < 0 || intensity > 100
      || typeof start !== "number" || !Number.isFinite(start) || start < 0 || typeof end !== "number" || !Number.isFinite(end) || end - start < .4 || end - start > 20.01 || end > analysis.duration_seconds + .02
      || (platform === "custom" && (typeof target !== "number" || !Number.isFinite(target) || target < -23 || target > -6))) return Response.json({ error: "Invalid control render settings or missing signed analysis" }, { status: 400 });
    const root = path.resolve(/*turbopackIgnore: true*/ process.env.TEMP_UPLOAD_DIR || "./uploads");
    const files = await readdir(/*turbopackIgnore: true*/ root);
    const filename = files.find(file => file.startsWith(id + "."));
    if (!filename) return Response.json({ error: "Source expired. Upload again." }, { status: 404 });
    const [actualRoot, filePath] = await Promise.all([realpath(/*turbopackIgnore: true*/ root), realpath(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ root, filename))]);
    const relative = path.relative(actualRoot, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const result = await fetch(`${process.env.PYTHON_SERVICE_URL || "http://localhost:8001"}/control-preview`, {
      method: "POST", headers: pythonServiceHeaders(), signal: AbortSignal.any([request.signal, AbortSignal.timeout(55000)]),
      body: JSON.stringify({ file_path: filePath, start, end, analysis, overrides, character, reference_analysis: reference, platform, preset, intensity, ...(platform === "custom" ? { target_lufs: target } : {}) }),
    });
    if (!result.ok) return Response.json({ error: "Control render failed" }, { status: result.status === 503 ? 503 : 422 });
    return new Response(result.body, { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return Response.json({ error: "Control render unavailable" }, { status: error instanceof JsonBodyError ? error.status : 503 });
  }
}
