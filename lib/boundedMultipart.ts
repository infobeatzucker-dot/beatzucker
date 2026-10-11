import { NextRequest, NextResponse } from "next/server";

const state = globalThis as typeof globalThis & { __uploadBudget?: { bytes: number; requests: number } };
const BUDGET = 256 * 1024 * 1024;
export class UploadRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function readBoundedMultipart(req: NextRequest, maxFileBytes: number) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin)
    throw new UploadRequestError("Forbidden", 403);
  const maximum = maxFileBytes + 1024 * 1024;
  if (Number(req.headers.get("content-length")) > maximum) throw new UploadRequestError("Audio upload too large. / Audio-Upload zu groß.", 413);
  if (!req.headers.get("content-type")?.includes("multipart/form-data")) throw new UploadRequestError("Invalid upload. / Ungültiger Upload.", 400);
  const budget = state.__uploadBudget ??= { bytes: 0, requests: 0 };
  if (budget.bytes + maximum > BUDGET || budget.requests >= 3)
    throw new UploadRequestError("Audio service busy. Try again shortly. / Audiodienst ausgelastet. Bitte gleich erneut versuchen.", 503);
  budget.bytes += maximum; budget.requests++;
  let released = false;
  function release() { if (!released) { released = true; budget.bytes -= maximum; budget.requests--; } }
  const reader = req.body?.getReader();
  try {
    if (!reader) throw new UploadRequestError("Empty upload. / Leerer Upload.", 400);
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    const deadline = Date.now() + 300_000;
    for (;;) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const next = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new UploadRequestError("Upload timed out. / Upload hat zu lange gedauert.", 408)), Math.max(1, Math.min(30_000, deadline - Date.now())));
        }),
      ]).finally(() => clearTimeout(timer));
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maximum) throw new UploadRequestError("Audio upload too large. / Audio-Upload zu groß.", 413);
      chunks.push(new Uint8Array(next.value));
    }
    let form: FormData;
    try { form = await new Response(new Blob(chunks), { headers: { "Content-Type": req.headers.get("content-type")! } }).formData(); }
    catch { throw new UploadRequestError("Invalid upload. / Ungültiger Upload.", 400); }
    // Hold the reservation while File/Blob data is used, not only during parsing.
    return { form, release };
  } catch (error) {
    if (reader) void reader.cancel().catch(() => {});
    release(); throw error;
  } finally { reader?.releaseLock(); }
}
export function uploadRequestFailure(error: unknown) {
  if (!(error instanceof UploadRequestError)) return null;
  return NextResponse.json({ error: error.message }, { status: error.status,
    ...(error.status === 503 ? { headers: { "Retry-After": "15" } } : {}) });
}
