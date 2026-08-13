/**
 * Auth helpers — password hashing, tier resolution, download token signing
 */

import { cookies } from "next/headers";
import { randomBytes, createHmac } from "crypto";
import bcrypt from "bcryptjs";

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET environment variable is required");
  return s;
}

// ── Password hashing ────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── HMAC session tokens (legacy + download tokens) ──────────────────
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function signToken(token: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(token);
  return `${token}.${hmac.digest("hex")}`;
}

export function verifyToken(signed: string): string | null {
  const parts = signed.split(".");
  if (parts.length !== 2) return null;
  const [token, sig] = parts;
  const hmac = createHmac("sha256", getSecret());
  hmac.update(token);
  const expected = hmac.digest("hex");
  if (sig !== expected) return null;
  return token;
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session")?.value;
  if (!raw) return null;
  return verifyToken(raw);
}

