import { Resend } from "resend";
import { DOWNLOAD_WINDOW_MS } from "@/lib/constants";

// Lazy initialization — avoids "Missing API key" error at build time
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "noreply@beatzucker.de";
const BASE = process.env.NEXTAUTH_URL ?? "https://beatzucker.de";
const YEAR = new Date().getFullYear();

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

// Shared header/footer snippets
const emailHeader = `
  <div style="padding:28px 32px 0;text-align:center;">
    <span style="font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;">
      <span style="color:#8b5cf6">Beat</span><span style="color:#38bdf8">zucker</span>
    </span>
  </div>`;

const emailFooter = `
  <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:0.72rem;color:#4b5563;">
    © ${YEAR} Beatzucker · Michael Clas · Plaidter Str. 31, 56648 Saffig<br>
    <a href="${BASE}/impressum" style="color:#6b7280;text-decoration:none;">Impressum</a> ·
    <a href="${BASE}/agb" style="color:#6b7280;text-decoration:none;">AGB</a> ·
    <a href="${BASE}/datenschutz" style="color:#6b7280;text-decoration:none;">Datenschutz</a> ·
    <a href="${BASE}/widerruf" style="color:#6b7280;text-decoration:none;">Widerruf</a> ·
    <a href="mailto:info@re-beatz.com" style="color:#6b7280;text-decoration:none;">info@re-beatz.com</a>
  </div>`;

const emailWrap = (content: string) => `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#1a1a2e;border:1px solid rgba(139,92,246,0.2);border-radius:14px;overflow:hidden;">
    ${emailHeader}
    <div style="padding:28px 32px 32px;">${content}</div>
    ${emailFooter}
  </div>
</body>
</html>`;

// ── Emails ───────────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const safeResetUrl = escapeHtml(resetUrl);
  const html = emailWrap(`
    <h1 style="color:#fff;font-size:1.25rem;font-weight:700;margin:0 0 12px;">Passwort zurücksetzen</h1>
    <p style="color:#9ca3af;font-size:0.92rem;line-height:1.6;margin:0 0 24px;">
      Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.
      Klicke auf den Button unten — der Link ist <strong style="color:#fff">15 Minuten</strong> gültig.
    </p>
    <a href="${safeResetUrl}"
       style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#8b5cf6,#38bdf8);
              color:#fff;font-weight:700;font-size:0.95rem;border-radius:8px;text-decoration:none;">
      Passwort zurücksetzen →
    </a>
    <p style="color:#6b7280;font-size:0.78rem;margin:20px 0 0;line-height:1.5;">
      Falls du kein Zurücksetzen angefordert hast, kannst du diese E-Mail ignorieren.
      Dein Passwort bleibt unverändert.<br><br>
      Link: <a href="${safeResetUrl}" style="color:#38bdf8;word-break:break-all;">${safeResetUrl}</a>
    </p>`);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Beatzucker – Passwort zurücksetzen",
    html,
  });
}

export async function sendWelcomeEmail(email: string) {
  const html = emailWrap(`
    <h1 style="color:#fff;font-size:1.2rem;font-weight:700;margin:0 0 12px;">Willkommen bei Beatzucker! 🎧</h1>
    <p style="color:#9ca3af;font-size:0.92rem;line-height:1.6;margin:0 0 20px;">
      Dein Konto ist aktiv. Du kannst jetzt sofort kostenlos mit allen Funktionen mastern —
      alle Formate, Auto AI, Referenz-Track-Mastering, ohne Abo.
    </p>
    <a href="${BASE}"
       style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#8b5cf6,#38bdf8);
              color:#fff;font-weight:700;font-size:0.92rem;border-radius:8px;text-decoration:none;">
      Jetzt mastern →
    </a>`);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Willkommen bei Beatzucker 🎧",
    html,
  });
}

// ── Mastering complete notification ──────────────────────────────────────────
export async function sendMasteringCompleteEmail(
  email: string,
  originalName: string,
  platform: string,
  lufsOut: number | null,
) {
  const safeOriginalName = escapeHtml(originalName);
  const safePlatform = escapeHtml(platform);
  const lufsStr = lufsOut != null ? `${lufsOut.toFixed(1)} LUFS` : "—";
  const deadline = new Date(Date.now() + DOWNLOAD_WINDOW_MS);
  const deadlineStr = deadline.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const windowLabel = "24 Stunden";

  const html = emailWrap(`
    <h1 style="color:#fff;font-size:1.25rem;font-weight:700;margin:0 0 12px;">
      ✓ Dein Master ist fertig
    </h1>
    <p style="color:#9ca3af;font-size:0.92rem;line-height:1.6;margin:0 0 20px;">
      Die Verarbeitung deines Tracks wurde erfolgreich abgeschlossen.
    </p>
    <div style="background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.2);border-radius:10px;padding:16px 20px;margin-bottom:16px;">
      <div style="margin-bottom:8px;">
        <span style="color:#6b7280;font-size:0.78rem;display:block;margin-bottom:2px;">Track</span>
        <span style="color:#fff;font-size:0.92rem;font-weight:600;">${safeOriginalName}</span>
      </div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        <div>
          <span style="color:#6b7280;font-size:0.78rem;display:block;margin-bottom:2px;">Plattform</span>
          <span style="color:#e5e7eb;font-size:0.88rem;">${safePlatform}</span>
        </div>
        <div>
          <span style="color:#6b7280;font-size:0.78rem;display:block;margin-bottom:2px;">Output LUFS</span>
          <span style="color:#38bdf8;font-size:0.88rem;font-weight:600;">${lufsStr}</span>
        </div>
      </div>
    </div>
    <div style="background:rgba(196,181,253,0.08);border:1px solid rgba(196,181,253,0.3);border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <span style="color:#c4b5fd;font-size:0.8rem;font-weight:700;display:block;margin-bottom:2px;">⏱ Download-Fenster: ${windowLabel}</span>
      <span style="color:#e5e7eb;font-size:0.85rem;">Gültig bis: <strong>${deadlineStr} Uhr</strong></span><br>
      <span style="color:#9ca3af;font-size:0.75rem;">Nach Ablauf wird die Datei automatisch gelöscht.</span>
    </div>
    <a href="${BASE}/account" style="display:inline-block;background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600;font-size:0.88rem;">
      Jetzt herunterladen →
    </a>`);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `✓ Master fertig: ${originalName}`,
    html,
  });
}

export async function sendLoginOtpEmail(email: string, otp: string) {
  const safeOtp = escapeHtml(otp);
  const html = emailWrap(`
    <h1 style="color:#fff;font-size:1.25rem;font-weight:700;margin:0 0 8px;text-align:center;">
      Dein Login-Code
    </h1>
    <p style="color:#9ca3af;font-size:0.88rem;text-align:center;margin:0 0 24px;">
      Gib diesen Code ein, um dich bei Beatzucker anzumelden.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:2.5rem;font-weight:800;letter-spacing:0.25em;color:#8b5cf6;
                   background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);
                   border-radius:12px;padding:0.5rem 1.5rem;display:inline-block;">
        ${safeOtp}
      </span>
    </div>
    <p style="color:#6b7280;font-size:0.78rem;text-align:center;margin:0;">
      Gültig für <strong style="color:#9ca3af;">10 Minuten</strong>.
      Falls du dich nicht angemeldet hast, ignoriere diese E-Mail.
    </p>`);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `${otp} – Dein Beatzucker Login-Code`,
    html,
  });
}

export async function sendMasteringErrorEmail(email: string, originalName: string) {
  const safeOriginalName = escapeHtml(originalName);
  const html = emailWrap(`
    <h1 style="color:#fff;font-size:1.25rem;font-weight:700;margin:0 0 12px;">
      Mastering fehlgeschlagen
    </h1>
    <p style="color:#9ca3af;font-size:0.92rem;line-height:1.6;margin:0 0 16px;">
      Bei der Verarbeitung deines Tracks ist leider ein Fehler aufgetreten.
    </p>
    <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <span style="color:#6b7280;font-size:0.78rem;display:block;margin-bottom:2px;">Track</span>
      <span style="color:#fff;font-size:0.92rem;font-weight:600;">${safeOriginalName}</span>
    </div>
    <p style="color:#9ca3af;font-size:0.85rem;line-height:1.6;margin:0 0 20px;">
      Bitte versuche es erneut. Falls der Fehler weiterhin auftritt, melde dich bei uns —
      wir helfen dir gerne weiter.
    </p>
    <a href="${BASE}" style="display:inline-block;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);color:#8b5cf6;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600;font-size:0.88rem;margin-right:10px;">
      Erneut versuchen →
    </a>
    <a href="mailto:info@re-beatz.com" style="display:inline-block;color:#6b7280;font-size:0.82rem;text-decoration:none;padding:10px 0;">
      Support kontaktieren
    </a>`);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Mastering fehlgeschlagen: ${originalName}`,
    html,
  });
}
