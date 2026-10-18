"use client";
import { useState } from "react";
export default function UserStemAccess({ userId, vocal, stems, en }: { userId: string; vocal: boolean; stems: boolean; en: boolean }) {
  const [value, setValue] = useState({ vocalRemoverEnabled: vocal, stemSeparationEnabled: stems });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function save(field: keyof typeof value, checked: boolean) {
    setBusy(true); setMessage("");
    const next = { ...value, [field]: checked };
    try {
      const response = await fetch("/api/admin/stem-access", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, ...next }) });
      if (!response.ok) throw Error();
      setValue(next); setMessage(en ? "Saved" : "Gespeichert");
    } catch { setMessage(en ? "Could not save" : "Speichern fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy} style={{ border: 0, padding: "12px 0 0", fontSize: 11 }}><legend>{en ? "Full separation access" : "Freischaltung für volle Trennung"}</legend>{([ ["vocalRemoverEnabled", "Vocal Remover"], ["stemSeparationEnabled", "Stem Separation"] ] as const).map(([field, label]) => <label key={field} style={{ display: "block", paddingTop: 6 }}><input type="checkbox" checked={value[field]} onChange={event => void save(field, event.target.checked)}/> {label}</label>)}<span role="status">{message}</span></fieldset>;
}
