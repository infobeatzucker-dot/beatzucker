import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

export class AuthRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Bound actual bytes, including requests without Content-Length. */
export async function readAuthRequest(req: NextRequest, budgetKey = "auth:requests"): Promise<Record<string, unknown>> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin) {
    throw new AuthRequestError("Forbidden", 403);
  }
  // Global ceiling is deliberate: client-supplied proxy headers must not bypass it.
  if (!rateLimit(budgetKey, 120, 60_000)) {
    throw new AuthRequestError("Too many requests. Please try again later.", 429);
  }
  const reader = req.body?.getReader();
  if (!reader) throw new AuthRequestError("Invalid request", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new AuthRequestError("Request too large", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new AuthRequestError("Invalid JSON", 400); }
}

export function authRequestFailure(error: unknown) {
  if (!(error instanceof AuthRequestError)) return null;
  return NextResponse.json({ error: error.message }, {
    status: error.status,
    headers: error.status === 429 ? { "Retry-After": "60" } : {},
  });
}
