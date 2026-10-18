import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

// GET /api/account/export
// Portable account-data export. Authentication secrets, password hashes,
// reset tokens, OTPs and live session tokens are intentionally never exported.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      accounts: {
        select: { provider: true, providerAccountId: true, type: true },
      },
      savedReferences: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, analysisJson: true, createdAt: true },
      },
      dailyCharges: {
        orderBy: { day: "desc" },
        select: { id: true, masterId: true, day: true },
      },
      masters: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, originalName: true, platform: true, preset: true,
          status: true, preAnalysis: true, postAnalysis: true, aiParams: true,
          notes: true, createdAt: true, completedAt: true, updatedAt: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      image:     user.image,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      dailyMasterLimit: user.dailyMasterLimit,
      vocalRemoverEnabled: user.vocalRemoverEnabled,
      stemSeparationEnabled: user.stemSeparationEnabled,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      termsLanguage: user.termsLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    linkedAccounts: user.accounts,
    masters: user.masters,
    savedReferences: user.savedReferences,
    dailyQuotaReceipts: user.dailyCharges,
    omittedSecurityData: [
      "password hash", "password-reset token", "one-time login code", "active session token",
    ],
  };

  const json = JSON.stringify(exportData, null, 2);
  const filename = `beatzucker-daten-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
