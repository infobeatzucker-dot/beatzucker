export class JsonBodyError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Count actual bytes, not just the optional Content-Length header. */
export async function readBoundedJson(request: Request, maxBytes = 65536): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new JsonBodyError("Request too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new JsonBodyError("Invalid JSON", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  const deadline = Date.now() + 60000;
  try {
    for (;;) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let item: ReadableStreamReadResult<Uint8Array>;
      try {
        item = await Promise.race([reader.read(), new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new JsonBodyError("Request timed out", 408)), Math.max(1, Math.min(30000, deadline - Date.now())));
        })]);
      } finally { clearTimeout(timer); }
      if (item.done) break;
      size += item.value.byteLength;
      if (size > maxBytes) throw new JsonBodyError("Request too large", 413);
      chunks.push(item.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let value: unknown;
    try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new JsonBodyError("Invalid JSON", 400); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new JsonBodyError("Invalid JSON", 400);
    return value as Record<string, unknown>;
  } catch (error) { void reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
}
