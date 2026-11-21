import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, open, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { sanitizeOriginalFilename } from "@/lib/filename";
import { labFormat, labFormats, labMaxBytes, labNoStore } from "@/lib/masteringLab";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 300;
const state = globalThis as typeof globalThis & { __labActiveExports?: Set<string>; __labLastPrune?: number };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: labNoStore });

async function pruneScratch(root: string) {
  const now = Date.now();
  if (now - (state.__labLastPrune ?? 0) < 3600000) return;
  state.__labLastPrune = now;
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^lab-export-[a-z0-9]{6}$/i.test(entry.name)) continue;
      const candidate = path.join(root, entry.name);
      const info = await stat(candidate).catch(() => null);
      if (info && now - info.mtimeMs > 24 * 3600000) await rm(candidate, { recursive: true, force: true }).catch(() => {});
    }
  } catch { /* A later export can retry scratch cleanup. */ }
}

export async function POST(req: NextRequest) {
  const userId = (await getServerSession(authOptions))?.user?.id;
  if (!userId) return fail("Sign in required", 401);
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin) return fail("Forbidden", 403);
  const hasAccess = () => db.masteringLabAccess.findUnique({ where: { userId }, select: { grantedAt: true } });
  if (!await hasAccess()) return fail("Download activation required", 403);

  const params = req.nextUrl.searchParams;
  const format = params.get("format");
  const ceiling = Number(params.get("ceiling") ?? "-0.1");
  const target = params.has("target") ? Number(params.get("target")) : null;
  const declared = Number(req.headers.get("content-length"));
  if (!labFormat(format) || !Number.isFinite(ceiling) || ceiling < -6 || ceiling > 0 ||
    (target !== null && (!Number.isFinite(target) || target < -23 || target > -6))) return fail("Invalid export settings", 400);
  if (declared > labMaxBytes) return fail("Export upload too large", 413);
  const body = req.body;
  if (req.headers.get("content-type") !== "audio/wav" || !body) return fail("Expected WAV audio", 415);
  const active = state.__labActiveExports ??= new Set();
  if (active.has(userId) || active.size >= 2) return fail("Export service busy", 503);
  if (!rateLimit(`lab-export:${userId}`, 8, 60_000) || !rateLimit("lab-export:global", 16, 60_000)) return fail("Try again later", 429);
  active.add(userId);
  let directory: string | undefined;
  let streaming = false;
  const clean = async () => {
    if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }).catch(() => {});
    active.delete(userId);
  };
  let oversized = false;
  try {
    const uploads = path.resolve(/*turbopackIgnore: true*/ process.env.TEMP_UPLOAD_DIR ?? "./uploads");
    await mkdir(uploads, { recursive: true });
    await pruneScratch(uploads);
    directory = await mkdtemp(path.join(uploads, "lab-export-"));
    const input = path.join(directory, "source.wav");
    let size = 0;
    const cap = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        size += chunk.length;
        oversized = size > labMaxBytes;
        if (oversized) callback(new Error("Payload too large"));
        else callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(body as NodeStream<Uint8Array>), cap, createWriteStream(input, { flags: "wx" }),
      { signal: AbortSignal.any([req.signal, AbortSignal.timeout(90000)]) });
    if (size <= 44) return fail("Invalid WAV", 415);
    const file = await open(input, "r");
    const head = Buffer.alloc(12);
    try { await file.read(head); } finally { await file.close(); }
    if (head.toString("ascii", 0, 4) !== "RIFF" || head.toString("ascii", 8, 12) !== "WAVE" || head.readUInt32LE(4) !== size - 8)
      return fail("Invalid WAV", 415);

    // Let the worker finish its bounded job before removing scratch files, even
    // when the browser disconnects while the encode is running.
    const rendered = await fetch(`${process.env.PYTHON_SERVICE_URL ?? "http://localhost:8001"}/mastering-lab/export`, {
      method: "POST", headers: pythonServiceHeaders(), signal: AbortSignal.timeout(220000),
      body: JSON.stringify({ file_path: input, format, ceiling, target }),
    });
    if (!rendered.ok) return fail("Could not render delivery", [422, 503].includes(rendered.status) ? rendered.status : 502);
    const measurements = await rendered.json();
    if (!await hasAccess()) return fail("Download activation required", 403);
    if (req.signal.aborted) return fail("Request cancelled", 499);
    const { ext, mime } = labFormats[format];
    const output = path.join(directory, `delivery.${ext}`);
    const result = await stat(output);
    const headers = new Headers(labNoStore);
    const filename = sanitizeOriginalFilename(params.get("name")).replace(/\.[^.]+$/, "") || "track";
    headers.set("Content-Disposition", `attachment; filename="beatzucker-master.${ext}"; filename*=UTF-8''${encodeURIComponent(filename + "-master." + ext).replace(/[!'()*]/g, letter => "%" + letter.charCodeAt(0).toString(16))}`);
    headers.set("Content-Type", mime);
    headers.set("Content-Length", String(result.size));
    headers.set("X-Content-Type-Options", "nosniff");
    for (const [key, header] of [["integrated_lufs", "X-Lab-LUFS"], ["true_peak", "X-Lab-True-Peak"], ["gain_db", "X-Lab-Gain"]]) {
      if (typeof measurements[key] === "number" && Number.isFinite(measurements[key])) headers.set(header, String(measurements[key]));
    }
    const stream = createReadStream(output);
    stream.once("close", () => { void clean(); });
    streaming = true;
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers });
  } catch {
    return fail(oversized ? "Export upload too large" : "Export unavailable", oversized ? 413 : 503);
  } finally {
    if (!streaming) await clean();
  }
}
