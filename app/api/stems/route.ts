import { NextRequest, NextResponse } from "next/server";
import { stemUser, stemAllowed, stemConfigured, stemFetch } from "@/lib/stemService";
import { readBoundedMultipart, uploadRequestFailure } from "@/lib/boundedMultipart";

export const runtime = "nodejs";
export const maxDuration = 180;
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
export async function GET(req: NextRequest) {
  const user = await stemUser();
  if (!user) return fail("Please sign in. / Bitte anmelden.", 401);
  if (!stemConfigured()) return NextResponse.json({ available: false, permissions: { vocalRemoverEnabled: user.vocalRemoverEnabled, stemSeparationEnabled: user.stemSeparationEnabled }, jobs: [] }, { headers });
  try {
    const id = req.nextUrl.searchParams.get("id");
    const asset = req.nextUrl.searchParams.get("asset");
    if (id && !/^[a-f0-9]{32}$/.test(id)) return fail("Invalid job", 400);
    if (asset && (!id || !["vocals", "instrumental", "drums", "bass", "other"].includes(asset))) return fail("Invalid stem", 400);
    if (asset) {
      const infoResponse = await stemFetch(user.id, `/jobs/${id}`);
      if (!infoResponse.ok) return fail("Not found", 404);
      const job = await infoResponse.json();
      // Re-read current DB permission on every asset request, not just submission.
      if (job.mode === "full" && !stemAllowed(user, job.tool)) return fail("Access revoked / Freischaltung aufgehoben", 403);
      const range = req.headers.get("range");
      if (range && !/^bytes=(?:\d{1,16}-\d{0,16}|-\d{1,16})$/.test(range)) return fail("Unsupported audio range", 416);
      const requestHeaders = new Headers({ "Accept-Encoding": "identity" });
      if (range) requestHeaders.set("Range", range);
      const result = await stemFetch(user.id, `/jobs/${id}/audio/${asset}`, { signal: req.signal, headers: requestHeaders });
      const transportHeaders = new Headers(headers);
      transportHeaders.set("Cache-Control", "private, no-store, no-transform");
      for (const key of ["content-range", "accept-ranges"]) {
        const value = result.headers.get(key);
        if (value) transportHeaders.set(key, value);
      }
      if (result.status === 416) {
        void result.body?.cancel().catch(() => {});
        return new Response(null, { status: 416, headers: transportHeaders });
      }
      if (!result.ok) return fail("Audio unavailable", result.status);
      const length = result.headers.get("content-length");
      if (length) transportHeaders.set("Content-Length", length);
      transportHeaders.set("Content-Type", "audio/wav");
      transportHeaders.set("Content-Disposition", `${job.mode === "full" && req.nextUrl.searchParams.get("play") !== "1" ? "attachment" : "inline"}; filename="beatzucker-${asset}.wav"`);
      return new Response(result.body, { status: result.status, headers: transportHeaders });
    }
    const result = await stemFetch(user.id, id ? `/jobs/${id}` : "/jobs");
    if (!result.ok) return fail("Job unavailable", result.status);
    return NextResponse.json({ available: true, permissions: { vocalRemoverEnabled: user.vocalRemoverEnabled, stemSeparationEnabled: user.stemSeparationEnabled }, ...(id ? { job: await result.json() } : { jobs: await result.json() }) }, { headers });
  } catch { return fail("Separation service unavailable. / Trennungsdienst nicht erreichbar.", 503); }
}
export async function POST(req: NextRequest) {
  const user = await stemUser();
  if (!user) return fail("Please sign in. / Bitte anmelden.", 401);
  if (!stemConfigured()) return fail("Not activated yet. / Noch nicht aktiviert.", 503);
  let release: (() => void) | undefined;
  try {
    const upload = await readBoundedMultipart(req, 40 * 1024 * 1024); release = upload.release;
    const file = upload.form.get("file"), tool = upload.form.get("tool"), mode = upload.form.get("mode");
    if (!(file instanceof File) || !file.size || file.size > 40 * 1024 * 1024 || !["vocal-remover", "stem-separation"].includes(String(tool)) || !["preview", "full"].includes(String(mode))) return fail("Invalid audio request", 400);
    if (mode === "full" && !stemAllowed(user, String(tool))) return fail("Admin activation required. / Admin-Freischaltung erforderlich.", 403);
    const body = new FormData(); body.set("file", file, "source.audio"); body.set("tool", String(tool)); body.set("mode", String(mode));
    const result = await stemFetch(user.id, "/jobs", { method: "POST", body });
    if (!result.ok) {
      const message = result.status === 429 ? "Daily separation limit reached. / Tageslimit für Trennungen erreicht."
        : result.status === 409 ? "An audio separation is already active. / Eine Trennung läuft bereits."
        : result.status === 413 ? "Maximum upload size: 40 MB. / Maximale Dateigröße: 40 MB."
        : result.status === 503 ? "Separation queue busy. Try again later. / Trennungsdienst ausgelastet. Bitte später erneut versuchen."
        : "Could not start separation. Please check the file. / Trennung konnte nicht starten. Bitte Datei prüfen.";
      return fail(message, [400, 409, 413, 429, 503].includes(result.status) ? result.status : 502);
    }
    return NextResponse.json(await result.json(), { status: result.status, headers });
  } catch (error) { return uploadRequestFailure(error) ?? fail("Separation service unavailable. / Trennungsdienst nicht erreichbar.", 503); }
  finally { release?.(); }
}
