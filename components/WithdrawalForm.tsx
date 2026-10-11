"use client";

import { FormEvent, useRef, useState } from "react";
import type { Lang } from "@/lib/types/mastering";

export default function WithdrawalForm({ lang = "de" }: { lang?: Lang }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [mailSent, setMailSent] = useState(false);
  const submission = useRef<{ key: string; details: string } | null>(null);
  const en = lang === "en";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const details = { name: data.get("name"), email: data.get("email"), contractReference: data.get("contractReference"), lang };
    const fingerprint = JSON.stringify(details);
    if (!submission.current || submission.current.details !== fingerprint) submission.current = { key: crypto.randomUUID(), details: fingerprint };
    try {
    const response = await fetch("/api/withdrawal", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": lang },
      body: JSON.stringify({ ...details, idempotencyKey: submission.current.key }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || (en ? "Submission failed." : "Übermittlung fehlgeschlagen.")); return; }
    setReceipt(result.receiptId || "OK"); setMailSent(result.mailStatus === "sent"); form.reset();
    } catch {
      setError(en ? "Network error. Please try again." : "Netzwerkfehler. Bitte versuche es erneut.");
    } finally { setBusy(false); }
  }

  if (receipt) return <div className="withdrawal-success" role="status"><strong>{en ? "Withdrawal received" : "Widerruf eingegangen"}</strong><p>{mailSent ? (en ? "Your email confirmation has been submitted for delivery." : "Deine E-Mail-Bestätigung wurde zum Versand übergeben.") : (en ? "Your withdrawal has been stored. Email confirmation is queued; failed sending attempts will be retried automatically." : "Dein Widerruf wurde gespeichert. Die E-Mail-Bestätigung ist zum Versand vorgemerkt; bei Versandproblemen versuchen wir es automatisch erneut.")}</p><code>{receipt}</code></div>;

  return <form className="withdrawal-form" onSubmit={submit}>
    <label>{en ? "Full name" : "Vor- und Nachname"}<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
    <label>{en ? "Email address used for the service" : "Für den Dienst verwendete E-Mail-Adresse"}<input name="email" required type="email" maxLength={255} autoComplete="email" /></label>
    <label>{en ? "Contract or account reference (optional)" : "Vertrags- oder Kontoreferenz (optional)"}<input name="contractReference" maxLength={200} placeholder={en ? "e.g. account email or date" : "z. B. Konto-E-Mail oder Datum"} /></label>
    <label className="withdrawal-confirm"><input type="checkbox" required /> <span>{en ? "I unequivocally withdraw the contract identified above." : "Ich widerrufe den oben bezeichneten Vertrag eindeutig."}</span></label>
    {error && <p className="withdrawal-error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? (en ? "Sending…" : "Wird gesendet…") : (en ? "Withdraw contract" : "Vertrag widerrufen")}</button>
    <small>{en ? "Your statement is stored before confirmation is sent by email. Please keep the receipt ID." : "Deine Erklärung wird vor dem Versand der E-Mail-Bestätigung gespeichert. Bitte bewahre die Eingangs-ID auf."}</small>
  </form>;
}
