import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { sendLoginOtpEmail } from "@/lib/email";

// POST /api/auth/otp — check credentials, send OTP if 2FA enabled
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });

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

    await sendLoginOtpEmail(email, otp).catch((err) => console.error("[email] otp:", err));

    return NextResponse.json({ requiresOtp: true });
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
