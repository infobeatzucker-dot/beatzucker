"use client";
import { useEffect, useId, useState } from "react";
import { DAILY_MASTER_LIMIT } from "@/lib/constants";
import { MAX_DAILY_MASTER_LIMIT } from "@/lib/masterQuota";
import type { Lang } from "@/lib/types/mastering";

export interface UserLimitValue { dailyMasterLimit: number | null; dailyLimit: number }
export default function UserDailyLimit({ userId, email, value, used, onSaved, lang = "de" }: { userId: string; email: string; value: number | null; used: number; onSaved: (value: UserLimitValue) => void; lang?: Lang }) {
  const en = lang === "en", id = useId();
  const [draft, setDraft] = useState(value === null ? "" : String(value)), [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(false);
  useEffect(() => { setDraft(value === null ? "" : String(value)); }, [value]);
  const parsed = draft.trim() === "" ? null : Number(draft);
  const valid = parsed === null || (Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_DAILY_MASTER_LIMIT);
  const save = async (next: number | null) => {
    if (saving) return;
    setSaving(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/user-limit", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, dailyMasterLimit: next }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Error(result.error || (en ? "Could not save." : "Speichern fehlgeschlagen."));
      onSaved({ dailyMasterLimit: result.dailyMasterLimit, dailyLimit: result.dailyLimit });
      setDraft(result.dailyMasterLimit === null ? "" : String(result.dailyMasterLimit));
      setMessage(en ? "Saved. Applies to new jobs immediately." : "Gespeichert. Gilt sofort für neue Aufträge.");
    } catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : (en ? "Could not save." : "Speichern fehlgeschlagen.")); }
    finally { setSaving(false); }
  };
  return <form onSubmit={event => { event.preventDefault(); if (valid) void save(parsed); }} style={{ minWidth: 245, maxWidth: 310 }}>
    <label htmlFor={id} style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>{en ? "Daily masters" : "Masterings pro Tag"} · {used} / {value ?? DAILY_MASTER_LIMIT}</label>
    <div style={{ display: "flex", gap: 6 }}>
      <input id={id} type="number" min={0} max={MAX_DAILY_MASTER_LIMIT} step={1} value={draft} disabled={saving} aria-label={`${en ? "Daily limit for" : "Tageslimit für"} ${email}`} aria-describedby={`${id}-hint`} placeholder={`${en ? "Default" : "Standard"}: ${DAILY_MASTER_LIMIT}`} onChange={event => { setDraft(event.target.value); setMessage(""); }} style={{ minWidth: 0, width: 90, padding: "7px 8px", borderRadius: 7, border: "1px solid rgba(var(--bz-border-9b8bd4),0.31373)", background: "rgb(var(--bz-paint-151b2c))", color: "rgb(var(--bz-paint-e2e9fa))" }} />
      <button type="submit" disabled={saving || !valid || parsed === value} style={{ padding: "7px 9px", borderRadius: 7, border: "1px solid rgba(var(--bz-border-92bde3),0.33333)", color: "rgb(var(--bz-paint-c2e8fa))", background: "rgb(var(--bz-paint-243249))", cursor: "pointer" }}>{saving ? "…" : en ? "Save" : "Speichern"}</button>
      <button type="button" disabled={saving || value === null} onClick={() => void save(null)} style={{ padding: "7px 9px", borderRadius: 7, border: "1px solid rgba(var(--bz-border-ffffff),0.13333)", color: "rgb(var(--bz-paint-bdc6da))", background: "rgba(var(--bz-paint-ffffff),0.02353)", cursor: "pointer" }}>{en ? "Default" : "Standard"}</button>
    </div>
    <small id={`${id}-hint`} style={{ display: "block", marginTop: 5, color: "var(--text-muted)", fontSize: 10 }}>{en ? "0 = no new masters. Blank = default. No carry-over." : "0 = keine neuen Master. Leer = Standard. Kein Übertrag."}</small>
    {message && <p role={error ? "alert" : "status"} style={{ fontSize: 11, marginTop: 6, color: error ? "rgb(var(--bz-paint-fca5a5))" : "rgb(var(--bz-paint-9ee6cf))" }}>{message}</p>}
  </form>;
}
