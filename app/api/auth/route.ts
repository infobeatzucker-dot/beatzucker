/**
 * Custom auth endpoints — register, forgot-password, reset-password
 * Login/logout handled by NextAuth at /api/auth/[...nextauth]
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { rateLimit } from "@/lib/rateLimit";
import { TERMS_VERSION } from "@/lib/terms";

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
  const allowed = process.env.NEXTAUTH_URL ?? "https://beatzucker.de";
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
    const body = await readAuthRequest(req);
    const t = (de: string, en: string) => body.lang === "en" ? en : de;
    const { action } = body;
    const emailValue = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    if (isValidEmail(emailValue) && !rateLimit(`auth:${action}:${emailValue}`, 5, 15 * 60_000)) {
      // Forgot-password remains uniform, including for unknown addresses.
      if (action === "forgot-password") return NextResponse.json({ ok: true });
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "900" } });
    }

    // ── Register ──────────────────────────────────────────
    if (action === "register") {
      if (body.termsAccepted !== true || body.termsVersion !== TERMS_VERSION)
        return NextResponse.json({ error: t("Bitte akzeptiere die aktuellen AGB.", "Please accept the current Terms of Service.") }, { status: 400 });
      const email    = emailValue;
      const password = typeof body.password === "string" ? body.password : "";

      if (!isValidEmail(email))
        return NextResponse.json({ error: t("Ungültige E-Mail-Adresse", "Invalid email address") }, { status: 400 });
      if (!isValidPassword(password))
        return NextResponse.json({ error: t("Passwort muss mind. 8 Zeichen, Groß-/Kleinbuchstaben und eine Zahl enthalten", "Password needs at least 8 characters, uppercase and lowercase letters, and a digit") }, { status: 400 });

      const existing = await db.user.findUnique({ where: { email } });
      if (existing)
        return NextResponse.json({ error: t("E-Mail bereits registriert", "Email already registered") }, { status: 409 });

      const hashed = await hashPassword(password);
      const user   = await db.user.create({
        data: { email, password: hashed, termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION, termsLanguage: body.lang === "en" ? "en" : "de",
          registrationNotification: { create: { provider: "credentials" } },
        },
      });

      // Fire-and-forget welcome email
      sendWelcomeEmail(email).catch((err) => console.error("[email] welcome:", err));

      return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
    }

    // ── Forgot password ───────────────────────────────────
    if (action === "forgot-password") {
      const email = emailValue;
      if (!isValidEmail(email))
        return NextResponse.json({ error: t("Ungültige E-Mail-Adresse", "Invalid email address") }, { status: 400 });

      const user = await db.user.findUnique({ where: { email } });

      if (user) {
        const token   = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        await db.user.update({
          where: { id: user.id },
          data: { passwordResetToken: token, passwordResetExpires: expires },
        });

        const baseUrl  = process.env.NEXTAUTH_URL ?? "https://beatzucker.de";
        const resetUrl = `${baseUrl}${body.lang === "en" ? "/en" : "/"}?reset=${token}`;

        sendPasswordResetEmail(email, resetUrl).catch((err) => console.error("[email] password-reset:", err));
      }

      // Always return OK — prevents email enumeration
      return NextResponse.json({ ok: true });
    }

    // ── Reset password ────────────────────────────────────
    if (action === "reset-password") {
      const token       = typeof body.token === "string" ? body.token : "";
      const newPassword = typeof body.password === "string" ? body.password : "";

      if (!/^[a-f0-9]{64}$/.test(token))
        return NextResponse.json({ error: t("Ungültiger Token", "Invalid reset link") }, { status: 400 });
      if (!isValidPassword(newPassword))
        return NextResponse.json({ error: t("Passwort muss mind. 8 Zeichen, Groß-/Kleinbuchstaben und eine Zahl enthalten", "Password needs at least 8 characters, uppercase and lowercase letters, and a digit") }, { status: 400 });

      const user = await db.user.findFirst({
        where: { passwordResetToken: token },
      });

      if (!user || !user.passwordResetExpires)
        return NextResponse.json({ error: t("Ungültiger oder abgelaufener Token", "Invalid or expired reset link") }, { status: 400 });

      if (user.passwordResetExpires < new Date())
        return NextResponse.json({ error: t("Token abgelaufen — bitte erneut anfordern", "Reset link expired — please request another") }, { status: 400 });

      const hashed = await hashPassword(newPassword);
      const updated = await db.user.updateMany({
        where: { id: user.id, passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
        data: {
          password:            hashed,
          passwordChangedAt:   new Date(),
          loginOtp:            null,
          loginOtpExpires:     null,
          passwordResetToken:  null,
          passwordResetExpires: null,
        },
      });

      if (updated.count !== 1) return NextResponse.json({ error: t("Ungültiger oder abgelaufener Token", "Invalid or expired reset link") }, { status: 400 });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: t("Unbekannte Aktion", "Unknown action") }, { status: 400 });

  } catch (err) {
    const failure = authRequestFailure(err);
    if (failure) return failure;
    console.error("[auth] POST error:", err);
    return NextResponse.json({ error: "Server error. Please try again. / Serverfehler. Bitte erneut versuchen." }, { status: 500 });
  }
}

// ── GET /api/auth — kept for legacy compatibility ────────────────────
export async function GET() {
  return NextResponse.json({ ok: true, note: "Use /api/auth/session for NextAuth session" });
}
