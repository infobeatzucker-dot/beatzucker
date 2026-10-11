import type { Session } from "next-auth";
import type { User, Prisma } from "@prisma/client";
import { verifyPassword } from "@/lib/auth";
import { AuthRequestError } from "@/lib/authRequest";
import { rateLimit } from "@/lib/rateLimit";

export function assertCurrentSession(session: Session, user: User) {
  if (session.user.id !== user.id || (session.passwordVersion ?? 0) !== (user.passwordChangedAt?.getTime() ?? 0)) {
    throw new AuthRequestError("Please sign in again. / Bitte erneut anmelden.", 401);
  }
}

/** Called inside the mutation transaction: OTP consumption rolls back on failure. */
export async function confirmAccountAction(tx: Prisma.TransactionClient, session: Session, user: User, body: Record<string, unknown>) {
  assertCurrentSession(session, user);
  if (!rateLimit(`account-confirm:${user.id}`, 5, 15 * 60_000)) {
    throw new AuthRequestError("Too many attempts. Please try again later. / Zu viele Versuche. Bitte später erneut versuchen.", 429);
  }
  if (!user.password) {
    const age = Date.now() - (session.authenticatedAt ?? 0);
    if (session.authProvider !== "google" || age < 0 || age > 5 * 60_000) {
      throw new AuthRequestError("Please confirm with Google again (valid for 5 minutes). / Bitte erneut mit Google bestätigen (5 Minuten gültig).", 401);
    }
    return;
  }
  if (typeof body.currentPassword !== "string" || body.currentPassword.length > 128 || !await verifyPassword(body.currentPassword, user.password)) {
    throw new AuthRequestError("Current password incorrect. / Aktuelles Passwort falsch.", 400);
  }
  if (user.twoFactorEnabled) {
    const otp = typeof body.otp === "string" ? body.otp : "";
    if (!/^\d{6}$/.test(otp)) throw new AuthRequestError("Email code required. / E-Mail-Code erforderlich.", 400);
    const consumed = await tx.user.updateMany({
      where: { id: user.id, loginOtp: otp, loginOtpExpires: { gt: new Date() } },
      data: { loginOtp: null, loginOtpExpires: null },
    });
    if (consumed.count !== 1) throw new AuthRequestError("Code invalid or expired. / Code ungültig oder abgelaufen.", 400);
  }
}
