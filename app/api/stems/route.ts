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
      const result = await stemFetch(user.id, `/jobs/${id}/audio/${asset}`);
      if (!result.ok) return fail("Audio unavailable", result.status);
      return new Response(result.body, { headers: { ...headers, "Content-Type": "audio/wav", "Content-Disposition": `${job.mode === "full" ? "attachment" : "inline"}; filename="beatzucker-${asset}.wav"` } });
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
