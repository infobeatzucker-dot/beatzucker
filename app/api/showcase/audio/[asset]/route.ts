import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { SHOWCASE_STORAGE, readShowcase } from "@/lib/showcasePublication";
export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!/^[0-9a-f-]{36}-(original|master)\.mp3$/.test(asset)) return new Response(null, { status: 404 });
  try {
    const publication = await readShowcase();
    if (!publication.tracks.some(track => track.original.url === `/api/showcase/audio/${asset}` || track.master.url === `/api/showcase/audio/${asset}`)) return new Response(null, { status: 404 });
    const file = path.join(/*turbopackIgnore: true*/ SHOWCASE_STORAGE, asset), info = await lstat(/*turbopackIgnore: true*/ file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 2_000_000 || path.dirname(await realpath(/*turbopackIgnore: true*/ file)) !== await realpath(/*turbopackIgnore: true*/ SHOWCASE_STORAGE)) return new Response(null, { status: 404 });
    const data = await readFile(/*turbopackIgnore: true*/ file), headers: Record<string, string> = { "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = match?.[1] ? Number(match[1]) : 0, end = match?.[2] ? Number(match[2]) : data.length - 1;
      if (match && !match[1] && match[2]) { start = Math.max(0, data.length - Number(match[2])); end = data.length - 1; }
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= data.length || end < start) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } });
      end = Math.min(end, data.length - 1); headers["Content-Range"] = `bytes ${start}-${end}/${data.length}`; headers["Content-Length"] = String(end-start+1);
      return new Response(data.subarray(start,end+1), { status: 206, headers });
    }
    return new Response(data, { headers: { ...headers, "Content-Length": String(data.length) } });
  } catch { return new Response(null, { status: 404 }); }
}
