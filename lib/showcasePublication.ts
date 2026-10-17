import path from "node:path";
import { unlink } from "node:fs/promises";
import { db } from "@/lib/db";
import { SHOWCASE_TRACKS, type ShowcaseTrack } from "@/lib/showcaseTracks";
// Runtime volume, never a build-time source dependency or part of the server bundle.
export const SHOWCASE_STORAGE = path.resolve(/*turbopackIgnore: true*/ process.env.SHOWCASE_STORAGE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "showcase"));
export class ShowcaseError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function removeReplacedExcerpts(previous: ShowcaseTrack[], next: ShowcaseTrack[]) {
  const kept = new Set(next.flatMap(track => [track.original.url,track.master.url]));
  for (const url of previous.flatMap(track => [track.original.url,track.master.url])) {
    if (kept.has(url) || !/^\/api\/showcase\/audio\/[0-9a-f-]{36}-(original|master)\.mp3$/.test(url)) continue;
    await unlink(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ SHOWCASE_STORAGE,path.basename(url))).catch(() => {});
  }
}
export async function readShowcase() {
  const row = await db.showcasePublication.findUnique({ where: { id: "public" } });
  return { revision: row?.revision ?? 0, tracks: row ? JSON.parse(row.tracksJson) as ShowcaseTrack[] : SHOWCASE_TRACKS };
}
export async function publishShowcase(revision: number, tracks: ShowcaseTrack[]) {
  if (!Number.isSafeInteger(revision) || revision < 0 || tracks.length < 1 || tracks.length > 5) throw new ShowcaseError("1–5 Hörbeispiele erforderlich. / Between 1 and 5 examples required.");
  try {
    return await db.$transaction(async tx => {
      const row = await tx.showcasePublication.findUnique({ where: { id: "public" } });
      if ((row?.revision ?? 0) !== revision) throw new ShowcaseError("Die Liste wurde inzwischen geändert. Bitte neu laden. / The list has changed. Please reload.", 409);
      if (row) {
        const changed = await tx.showcasePublication.updateMany({ where: { id: "public", revision }, data: { tracksJson: JSON.stringify(tracks), revision: { increment: 1 } } });
        if (!changed.count) throw new ShowcaseError("Bitte neu laden. / Please reload.", 409);
      } else await tx.showcasePublication.create({ data: { id: "public", revision: 1, tracksJson: JSON.stringify(tracks) } });
      return { revision: revision + 1, tracks };
    });
  } catch (error) {
    if (["P2002","P2034","P2028","P1008"].includes((error as { code?: string }).code || "")) throw new ShowcaseError("Gleichzeitige Änderung. Bitte erneut laden. / Concurrent edit. Please reload.", 409);
    throw error;
  }
}
export function showcaseMetadata(body: Record<string, unknown>) {
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 90 || typeof body.genre !== "string" || !body.genre.trim() || body.genre.length > 60) throw new ShowcaseError("Titel (max. 90) und Genre (max. 60 Zeichen) sind erforderlich. / Title and genre are required.");
  return { title: body.title.trim(), genre: body.genre.trim() };
}
