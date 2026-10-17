import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { readShowcase, publishShowcase, showcaseMetadata, removeReplacedExcerpts, ShowcaseError, SHOWCASE_STORAGE } from "@/lib/showcasePublication";
import { verifyUpload } from "@/lib/uploadAuthorization";
import { findFileById } from "@/lib/storage";
import { pythonServiceHeaders } from "@/lib/pythonService";
import type { ShowcaseTrack } from "@/lib/showcaseTracks";
export const maxDuration = 240;
const privateHeaders = { "Cache-Control": "no-store" };
export async function GET() {
  if (!await requireAdmin(await getServerSession(authOptions))) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(await readShowcase(), { headers: privateHeaders });
}
export async function PATCH(request: NextRequest) { return edit(request, false); }
export async function POST(request: NextRequest) { return edit(request, true); }
async function edit(request: NextRequest, render: boolean) {
  const session = await getServerSession(authOptions);
  if (!await requireAdmin(session)) return Response.json({ error: "Forbidden" }, { status: 403 });
  let assetId: string | undefined;
  try {
    const body = await readAuthRequest(request), current = await readShowcase();
    if (!Number.isSafeInteger(body.revision) || body.revision !== current.revision) throw new ShowcaseError("Die Liste hat sich geändert. Bitte neu laden. / The list has changed. Please reload.",409);
    const index = current.tracks.findIndex(track => track.id === body.id);
    let tracks = [...current.tracks];
    if (!render && body.action === "delete") {
      if (index < 0) throw new ShowcaseError("Nicht gefunden. / Not found.",404);
      tracks.splice(index,1);
    } else {
      const metadata = showcaseMetadata(body);
      if (!render) {
        if (body.action !== "metadata" || index < 0) throw new ShowcaseError("Nicht gefunden. / Not found.",404);
        const position = body.position;
        if (typeof position !== "number" || !Number.isInteger(position) || position < 1 || position > tracks.length) throw new ShowcaseError("Ungültige Reihenfolge. / Invalid order.");
        const [track] = tracks.splice(index,1); tracks.splice(position-1,0,{ ...track,...metadata });
      } else {
        if (index < 0 && body.id !== null) throw new ShowcaseError("Nicht gefunden. / Not found.",404);
        if (index < 0 && tracks.length >= 5) throw new ShowcaseError("Maximal fünf Hörbeispiele. / Maximum five examples.");
        if (body.publishConsent !== true) throw new ShowcaseError("Bitte Veröffentlichungsrechte bestätigen. / Please confirm publication rights.");
        if (typeof body.start !== "number" || !Number.isFinite(body.start) || body.start < 0 || body.start > 600) throw new ShowcaseError("Ungültiger Startpunkt. / Invalid start.");
        const inputs: string[] = [];
        for (const value of [body.original,body.master]) {
          const file = value as { file_id?: string; upload_token?: string } | null;
          if (!file || typeof file.file_id !== "string" || !/^[0-9a-f-]{36}$/i.test(file.file_id) || !verifyUpload(file.file_id,session!.user!.id,file.upload_token)) throw new ShowcaseError("Kein Zugriff auf den Upload. / Upload not authorized.",403);
          const input = await findFileById(file.file_id); if (!input) throw new ShowcaseError("Upload abgelaufen. Bitte erneut hochladen. / Upload expired. Please upload again.",404); inputs.push(path.resolve(input));
        }
        assetId = randomUUID();
        const service = await fetch(`${process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8001"}/showcase-prepare`,{ method:"POST",headers:pythonServiceHeaders(),body:JSON.stringify({original:inputs[0],master:inputs[1],start:body.start,asset_id:assetId}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(210000)]) });
        if (!service.ok) {
          const detail = await service.json().catch(()=>null);
          throw new ShowcaseError(service.status === 503 ? "Audiodienst ausgelastet. Bitte später erneut versuchen. / Audio service busy. Please retry later." : (typeof detail?.detail === "string" ? detail.detail : "Hörproben konnten nicht erstellt werden. / Could not prepare excerpts."),service.status === 503 ? 503 : 422);
        }
        const prepared = await service.json();
        for (const side of ["original","master"] as const) {
          const item=prepared[side];
          if (item?.url !== `/api/showcase/audio/${assetId}-${side}.mp3` || !Number.isFinite(item.metrics?.lufs) || !Number.isFinite(item.metrics?.truePeak) || !Number.isFinite(item.metrics?.crest) || !Array.isArray(item.waveform) || item.waveform.length !== 128 || !item.waveform.every((value:unknown)=>typeof value === "number" && Number.isFinite(value) && value >= 0) || !(item.duration > 23.9 && item.duration < 24.2)) throw new ShowcaseError("Ungültige Hörprobe. / Invalid excerpt.",502);
        }
        const track: ShowcaseTrack = { id: index < 0 ? randomUUID() : tracks[index].id, ...metadata, sourceStart: body.start, duration: 24, original: prepared.original, master: prepared.master };
        if (index < 0) tracks.push(track); else tracks[index] = track;
      }
    }
    const publication = await publishShowcase(current.revision,tracks);
    assetId = undefined; // The committed pair must never be removed by failure cleanup.
    await removeReplacedExcerpts(current.tracks,publication.tracks);
    return Response.json({ok:true,...publication},{headers:privateHeaders});
  } catch (error) {
    // Only freshly generated UUID-owned files can be removed, never current excerpts.
    if (assetId) await Promise.all(["original","master"].map(side=>unlink(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ SHOWCASE_STORAGE,`${assetId}-${side}.mp3`)).catch(()=>{})));
    const failure=authRequestFailure(error); if(failure)return failure;
    if(error instanceof ShowcaseError)return Response.json({error:error.message},{status:error.status,headers:privateHeaders});
    console.error("[admin] showcase update failed");
    return Response.json({error:"Änderung fehlgeschlagen. Vorhandene Hörproben bleiben erhalten. / Update failed. Existing excerpts remain unchanged."},{status:500,headers:privateHeaders});
  }
}
