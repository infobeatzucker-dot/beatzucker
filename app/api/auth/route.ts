/**
 * Custom auth endpoints — register, forgot-password, reset-password
 * Login/logout handled by NextAuth at /api/auth/[...nextauth]
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";

// ── Validation helpers ───────────────────────────────────────────────
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function isValidPassword(pw: string): boolean {
  if (typeof pw !== "string" || pw.length < 8 || pw.length > 128) return false;
  // Require at least one uppercase, one lowercase, one digit
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

// ── CSRF: reject requests from unknown origins ───────────────────────
function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  // Same-origin fetch or non-browser clients (curl, server-side) have no Origin header — allow
  if (!origin) return true;
  const allowed = process.env.NEXTAUTH_URL ?? "https://upmado.com";
  try {
    return new URL(origin).host === new URL(allowed).host;
  } catch {
    return false;
  }
}

// ── POST /api/auth ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isValidOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { action } = body;

    // ── Register ──────────────────────────────────────────
    if (action === "register") {
      const email    = (body.email ?? "").toLowerCase().trim();
      const password = body.password ?? "";

      if (!isValidEmail(email))
        return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
      if (!isValidPassword(password))
        return NextResponse.json({ error: "Passwort muss mind. 8 Zeichen, Groß-/Kleinbuchstaben und eine Zahl enthalten" }, { status: 400 });

      const existing = await db.user.findUnique({ where: { email } });
      if (existing)
        return NextResponse.json({ error: "E-Mail bereits registriert" }, { status: 409 });

      const hashed = await hashPassword(password);
      const user   = await db.user.create({
        data: { email, password: hashed },
      });

      // Fire-and-forget welcome email
      sendWelcomeEmail(email).catch((err) => console.error("[email] welcome:", err));

      return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
    }

    // ── Forgot password ───────────────────────────────────
    if (action === "forgot-password") {
      const email = (body.email ?? "").toLowerCase().trim();
      if (!isValidEmail(email))
        return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });

      const user = await db.user.findUnique({ where: { email } });

      if (user) {
        const token   = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        await db.user.update({
          where: { id: user.id },
          data: { passwordResetToken: token, passwordResetExpires: expires },
        });

        const baseUrl  = process.env.NEXTAUTH_URL ?? "https://upmado.com";
        const resetUrl = `${baseUrl}/?reset=${token}`;

        sendPasswordResetEmail(email, resetUrl).catch((err) => console.error("[email] password-reset:", err));
      }

      // Always return OK — prevents email enumeration
      return NextResponse.json({ ok: true });
    }

    // ── Reset password ────────────────────────────────────
    if (action === "reset-password") {
      const token       = body.token ?? "";
      const newPassword = body.password ?? "";

      if (!token)
        return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
      if (!isValidPassword(newPassword))
        return NextResponse.json({ error: "Passwort muss mind. 8 Zeichen, Groß-/Kleinbuchstaben und eine Zahl enthalten" }, { status: 400 });

      const user = await db.user.findFirst({
        where: { passwordResetToken: token },
      });

      if (!user || !user.passwordResetExpires)
        return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 400 });

      if (user.passwordResetExpires < new Date())
        return NextResponse.json({ error: "Token abgelaufen — bitte erneut anfordern" }, { status: 400 });

      const hashed = await hashPassword(newPassword);
      await db.user.update({
        where: { id: user.id },
        data: {
          password:            hashed,
          passwordResetToken:  null,
          passwordResetExpires: null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });

  } catch (err) {
    console.error("[auth] POST error:", err);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}

// ── GET /api/auth — kept for legacy compatibility ────────────────────
export async function GET() {
  return NextResponse.json({ ok: true, note: "Use /api/auth/session for NextAuth session" });
}
