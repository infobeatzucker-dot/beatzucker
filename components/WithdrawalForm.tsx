"use client";

import { FormEvent, useState } from "react";
import type { Lang } from "@/lib/types/mastering";

export default function WithdrawalForm({ lang = "de" }: { lang?: Lang }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const en = lang === "en";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/withdrawal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.get("name"), email: data.get("email"), contractReference: data.get("contractReference"), lang }),
    });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError(result.error || (en ? "Submission failed." : "Übermittlung fehlgeschlagen.")); return; }
    setReceipt(result.receiptId || "OK"); form.reset();
  }

  if (receipt) return <div className="withdrawal-success" role="status"><strong>{en ? "Withdrawal received" : "Widerruf eingegangen"}</strong><p>{en ? "We sent a confirmation to your email address." : "Wir haben eine Bestätigung an deine E-Mail-Adresse gesendet."}</p><code>{receipt}</code></div>;

  return <form className="withdrawal-form" onSubmit={submit}>
    <label>{en ? "Full name" : "Vor- und Nachname"}<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
    <label>{en ? "Email address used for the service" : "Für den Dienst verwendete E-Mail-Adresse"}<input name="email" required type="email" maxLength={255} autoComplete="email" /></label>
    <label>{en ? "Contract or account reference (optional)" : "Vertrags- oder Kontoreferenz (optional)"}<input name="contractReference" maxLength={200} placeholder={en ? "e.g. account email or date" : "z. B. Konto-E-Mail oder Datum"} /></label>
    <label className="withdrawal-confirm"><input type="checkbox" required /> <span>{en ? "I unequivocally withdraw the contract identified above." : "Ich widerrufe den oben bezeichneten Vertrag eindeutig."}</span></label>
    {error && <p className="withdrawal-error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? (en ? "Sending…" : "Wird gesendet…") : (en ? "Withdraw contract" : "Vertrag widerrufen")}</button>
    <small>{en ? "You will immediately receive confirmation on a durable medium by email." : "Du erhältst unmittelbar eine Eingangsbestätigung auf einem dauerhaften Datenträger per E-Mail."}</small>
  </form>;
}
