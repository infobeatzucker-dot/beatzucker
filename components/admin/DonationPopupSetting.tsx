"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types/mastering";

export default function DonationPopupSetting({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "load-error" | "save-error" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/donation-popup", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw Error("Unavailable");
        const value = await response.json();
        if (typeof value.enabled !== "boolean") throw Error("Invalid setting");
        if (!controller.signal.aborted) setEnabled(value.enabled);
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("load-error"); });
    return () => controller.abort();
  }, []);

  async function toggle() {
    if (enabled === null || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/donation-popup", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }),
      });
      if (!response.ok) throw Error("Save failed");
      const value = await response.json();
      if (typeof value.enabled !== "boolean") throw Error("Invalid setting");
      setEnabled(value.enabled);
      setStatus("saved");
    } catch {
      setStatus("save-error");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-labelledby="donation-popup-setting" className="glass-panel p-5 mb-6">
    <h2 id="donation-popup-setting" className="font-bold">{en ? "Donation popup on the homepage" : "Spenden-Popup auf der Startseite"}</h2>
    <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>{en
      ? "Shows the donation appeal to visitors who have not dismissed it in their browser."
      : "Zeigt den Spendenaufruf für Besucher, die ihn in ihrem Browser noch nicht geschlossen haben."}</p>
    <label className="inline-flex items-center gap-2 mt-3 text-sm">
      <input type="checkbox" role="switch" checked={enabled === true} disabled={enabled === null || busy} onChange={() => void toggle()}/>
      {en ? "Show donation popup" : "Spenden-Popup anzeigen"}
    </label>
    {status && <p className="text-sm mt-2" role={status === "saved" ? "status" : "alert"}>{status === "saved"
      ? (en ? "Saved." : "Gespeichert.")
      : status === "load-error"
        ? (en ? "Could not load the setting." : "Die Einstellung konnte nicht geladen werden.")
        : (en ? "Could not save the setting." : "Die Einstellung konnte nicht gespeichert werden.")}</p>}
  </section>;
}
