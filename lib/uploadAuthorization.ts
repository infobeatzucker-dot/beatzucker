import { createHmac, timingSafeEqual } from "crypto";

function signingSecret(): string {
  return process.env.UPLOAD_SIGNING_SECRET
    || process.env.ANALYSIS_SIGNING_SECRET
    || process.env.NEXTAUTH_SECRET
    || "";
}

/**
 * Creates a capability for one uploaded file that is cryptographically bound
 * to the authenticated account. This avoids exposing every temporary upload to
 * any other signed-in user without requiring another persistent database row.
 */
export function signUpload(fileId: string, userId: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(fileId)
    .update("\0")
    .update(userId)
    .digest("hex");
}

export function verifyUpload(fileId: string, userId: string, token: unknown): boolean {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = signUpload(fileId, userId);
  if (!expected) return false;
  return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
}
