import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { Readable } from "node:stream";

// GET /api/account/export
// Portable account-data export. Authentication secrets, password hashes,
// reset tokens, OTPs and live session tokens are intentionally never exported.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
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
      labPresets: {select:{id:true,name:true,settingsJson:true,createdAt:true,updatedAt:true}},
      communityExamples: {select:{id:true,artist:true,problem:true,settings:true,language:true,trackJson:true,createdAt:true,publishedAt:true,
        consentAt:true,consentVersion:true,reviewedAt:true,rejectionReason:true}},
      masteringLabAccess:{select:{grantedAt:true}},
      labRenders:{select:{id:true,originalName:true,format:true,targetLufs:true,completedAt:true}},
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
      uiTheme: user.uiTheme,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      termsLanguage: user.termsLanguage,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      lastMasteredAt: user.lastMasteredAt,
      updatedAt: user.updatedAt,
    },
    linkedAccounts: user.accounts,
    savedReferences: user.savedReferences,
    labPresets: user.labPresets,
    masteringLabAccess: user.masteringLabAccess,
    labRenders:user.labRenders,
    communityExamples: user.communityExamples.map(example=>({...example,audio:{
      original:`/api/community/audio/${example.id}/original`,master:`/api/community/audio/${example.id}/master`,
    }})),
    communityAudioDelivery: "Audio excerpts are separate from this JSON. Sign in and use the listed paths or the listening player on the community page.",
    dailyQuotaReceipts: user.dailyCharges,
    omittedSecurityData: [
      "password hash", "password-reset token", "one-time login code", "active session token",
    ],
  };

  const userId=user.id;
  async function* streamExport() {
    const encoder=new TextEncoder();
    yield encoder.encode(JSON.stringify(exportData).slice(0,-1)+',"masters":[');
    let after: {id:string;createdAt:Date} | undefined;
    let separator = "";
    for (;;) {
      const batch = await db.master.findMany({
        where:{userId,...(after?{OR:[{createdAt:{lt:after.createdAt}},{createdAt:after.createdAt,id:{lt:after.id}}]}:{})},
        orderBy:[{createdAt:"desc"},{id:"desc"}],take:50,
        select:{id:true,originalName:true,platform:true,preset:true,workspace:true,status:true,preAnalysis:true,postAnalysis:true,aiParams:true,notes:true,
          createdAt:true,completedAt:true,updatedAt:true},
      });
      for (const item of batch) {
        yield encoder.encode(separator+JSON.stringify(item));
        separator=",";
      }
      if (batch.length<50) break;
      after=batch[batch.length-1];
    }
    yield encoder.encode("]}");
  }
  const filename = `beatzucker-daten-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(Readable.toWeb(Readable.from(streamExport())) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
