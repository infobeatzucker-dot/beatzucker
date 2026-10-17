import path from "path";
import { readdir, realpath } from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { verifyUpload } from "@/lib/uploadAuthorization";
import { rateLimit } from "@/lib/rateLimit";
import { JsonBodyError, readBoundedJson } from "@/lib/boundedJson";
import { pythonServiceHeaders } from "@/lib/pythonService";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || "https://beatzucker.de").origin) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(`preview-section:${session.user.id}`, 30, 60000) || !rateLimit("preview-section:global", 120, 60000)) return Response.json({ error: "Please wait" }, { status: 429 });
  try {
    const body = await readBoundedJson(request, 2048), id = typeof body.file_id === "string" ? body.file_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "Invalid upload" }, { status: 400 });
    if (!verifyUpload(id, session.user.id, body.upload_token)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const { start, end } = body;
    if (typeof start !== "number" || !Number.isFinite(start) || start < 0 || typeof end !== "number" || !Number.isFinite(end) || end - start < .001 || end - start > 20.01) return Response.json({ error: "Invalid section" }, { status: 400 });
    const root = path.resolve(/*turbopackIgnore: true*/ process.env.TEMP_UPLOAD_DIR || "./uploads");
    const files = await readdir(/*turbopackIgnore: true*/ root), name = files.find(file => file.startsWith(id + "."));
    if (!name) return Response.json({ error: "Source expired" }, { status: 404 });
    const [actualRoot, file] = await Promise.all([realpath(/*turbopackIgnore: true*/ root), realpath(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ root, name))]);
    const relative = path.relative(actualRoot, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const response = await fetch(`${process.env.PYTHON_SERVICE_URL || "http://localhost:8001"}/preview-section`, { method: "POST", headers: pythonServiceHeaders(), signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]), body: JSON.stringify({ file_path: file, start, end }) });
    if (!response.ok) return Response.json({ error: "Preview unavailable" }, { status: response.status === 503 ? 503 : 422 });
    return new Response(response.body, { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, no-store" } });
  } catch (error) { return Response.json({ error: "Preview unavailable" }, { status: error instanceof JsonBodyError ? error.status : 503 }); }
}
