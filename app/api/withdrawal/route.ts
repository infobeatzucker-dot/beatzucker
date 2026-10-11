import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readAuthRequest, AuthRequestError } from "@/lib/authRequest";
import { rateLimit } from "@/lib/rateLimit";
import { deliverWithdrawal } from "@/lib/withdrawalQueue";

export async function POST(req: NextRequest) {
  let lang: "de" | "en" = req.headers.get("accept-language")?.startsWith("en") ? "en" : "de";
  try {
    const body = await readAuthRequest(req);
    lang = body.lang === "en" ? "en" : "de";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const contractReference = typeof body.contractReference === "string" ? body.contractReference.trim() : "";
    const key = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
    if (name.length < 2 || name.length > 120 || email.length > 255 || contractReference.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-f0-9-]{36}$/i.test(key)) {
      return NextResponse.json({ error: lang === "en" ? "Please provide valid form details." : "Bitte gültige Formulardaten angeben." }, { status: 400 });
    }
    const submissionKey = createHash("sha256").update(key).digest("hex");
    const requestHash = createHash("sha256").update(JSON.stringify({ name, email, contractReference, lang })).digest("hex");
    let receipt = await db.withdrawalReceipt.findUnique({ where: { submissionKey } });
    if (!receipt) {
      if (!rateLimit(`withdrawal:email:${email}`, 3, 3600_000) || !rateLimit("withdrawal:new", 30, 60_000)) {
        return NextResponse.json({ error: lang === "en" ? "Too many requests. Please try again later." : "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": "3600" } });
      }
      const receivedAt = new Date();
      const retainUntil = new Date(receivedAt);
      retainUntil.setUTCFullYear(retainUntil.getUTCFullYear() + 3);
      try {
        receipt = await db.withdrawalReceipt.create({ data: {
          id: `BZ-${submissionKey.slice(0, 24).toUpperCase()}`, submissionKey, requestHash,
          name, email, contractReference, lang, receivedAt, retainUntil,
        } });
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
        receipt = await db.withdrawalReceipt.findUniqueOrThrow({ where: { submissionKey } });
      }
    }
    if (receipt.requestHash !== requestHash) return NextResponse.json({ error: lang === "en" ? "This submission identifier has already been used with different details." : "Diese Übermittlungskennung wurde bereits mit anderen Angaben verwendet." }, { status: 409 });
    const mailStatus = receipt.userEmailSentAt ? "sent" : "pending";
    // Receipt is committed before contacting the provider. The persistent queue
    // retries after process termination and never creates another receipt.
    if (!receipt.userEmailSentAt || !receipt.adminEmailSentAt) {
      void deliverWithdrawal(receipt.id).catch(() => console.warn("[withdrawal] Delivery deferred to queue"));
    }
    return NextResponse.json({ ok: true, receiptId: receipt.id, receivedAt: receipt.receivedAt, mailStatus }, { status: mailStatus === "sent" ? 200 : 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AuthRequestError ? error.status : 503;
    return NextResponse.json({ error: lang === "en" ? "Your submission could not be stored. Please try again or email info@re-beatz.com." : "Deine Erklärung konnte nicht gespeichert werden. Bitte erneut versuchen oder an info@re-beatz.com senden." }, { status });
  }
}
