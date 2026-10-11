import { NextRequest, NextResponse } from "next/server";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { TERMS_VERSION } from "@/lib/terms";
import { CONSENT_COOKIE, CONSENT_SECONDS, signTermsConsent } from "@/lib/termsConsent";

// Necessary, short-lived proof for the redirect to Google; no tracking cookie.
export async function POST(req: NextRequest) {
  try {
    const body = await readAuthRequest(req);
    if (body.accepted !== true || body.version !== TERMS_VERSION)
      return NextResponse.json({ error: "Please accept the current Terms. / Bitte die aktuellen AGB akzeptieren." }, { status: 400 });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(CONSENT_COOKIE, signTermsConsent(body.lang === "en" ? "en" : "de"), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CONSENT_SECONDS,
    });
    return response;
  } catch (error) {
    return authRequestFailure(error) ?? NextResponse.json({ error: "Registration unavailable. / Registrierung nicht verfügbar." }, { status: 503 });
  }
}
