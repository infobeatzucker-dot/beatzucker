import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendWithdrawalEmails } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

function validOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de");
    return new URL(origin).host === expected.host;
  } catch { return false; }
}

function clientKey(req: NextRequest) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(`withdrawal:${clientKey(req)}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const lang = body.lang === "en" ? "en" : "de";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : "";
    const contractReference = typeof body.contractReference === "string" ? body.contractReference.trim().slice(0, 200) : "";
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: lang === "en" ? "Please provide your name and a valid email address." : "Bitte Name und gültige E-Mail-Adresse angeben." }, { status: 400 });
    }

    const receiptId = `BZ-${randomUUID().slice(0, 8).toUpperCase()}`;
    await sendWithdrawalEmails({ name, email, contractReference, receivedAt: new Date(), receiptId, lang });
    return NextResponse.json({ ok: true, receiptId });
  } catch (error) {
    console.error("[withdrawal] submission failed", error);
    return NextResponse.json({ error: "Der Widerruf konnte gerade nicht übermittelt werden. Bitte sende ihn an info@re-beatz.com." }, { status: 500 });
  }
}
