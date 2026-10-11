import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { sendLoginOtpEmail } from "@/lib/email";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/auth/otp — check credentials, send OTP if 2FA enabled
export async function POST(req: NextRequest) {
  try {
    const body = await readAuthRequest(req);
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || email.length > 255 || !password || password.length > 128)
      return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });

    if (!rateLimit(`otp:${email}`, 5, 15 * 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "900" } });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // No user or no password (Google-only) or wrong password → uniform error
    if (!user?.password) {
      return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid)
      return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });

    if (!user.twoFactorEnabled) return NextResponse.json({ requiresOtp: false });

    // Generate cryptographically secure 6-digit OTP (crypto.randomInt is CSPRNG)
    const otp     = randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.user.update({
      where: { id: user.id },
      data:  { loginOtp: otp, loginOtpExpires: expires },
    });

    await sendLoginOtpEmail(email, otp);

    return NextResponse.json({ requiresOtp: true });
  } catch (err) {
    const failure = authRequestFailure(err);
    if (failure) return failure;
    console.error("[auth] OTP delivery failed:", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
