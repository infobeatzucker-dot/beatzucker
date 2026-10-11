import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { TERMS_VERSION } from "@/lib/terms";

export const CONSENT_COOKIE = "beatzucker-registration-terms";
export const CONSENT_SECONDS = 30 * 60;
type Proof = { version: string; acceptedAt: number; lang: "de" | "en" };
function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw Error("NEXTAUTH_SECRET is required");
  return value;
}
export function signTermsConsent(lang: "de" | "en", now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ version: TERMS_VERSION, acceptedAt: now, lang })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function verifyTermsConsent(value: string | undefined, now = Date.now()): Proof | null {
  if (!value || value.length > 1024) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const proof = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (proof.version !== TERMS_VERSION || !Number.isFinite(proof.acceptedAt) || proof.acceptedAt > now
      || now - proof.acceptedAt > CONSENT_SECONDS * 1000 || !["de", "en"].includes(proof.lang)) return null;
    return proof;
  } catch { return null; }
}
export async function registrationTermsProof() {
  return verifyTermsConsent((await cookies()).get(CONSENT_COOKIE)?.value);
}
