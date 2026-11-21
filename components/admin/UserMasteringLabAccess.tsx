"use client";

import { useState } from "react";

export default function UserMasteringLabAccess({ userId, enabled, en }: { userId: string; enabled: boolean; en: boolean }) {
  const [granted, setGranted] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(next: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/mastering-lab-access", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, enabled: next }),
      });
      if (!response.ok) throw new Error();
      setGranted(next);
      setMessage(en ? "Saved" : "Gespeichert");
    } catch {
      setMessage(en ? "Could not save" : "Speichern fehlgeschlagen");
    } finally { setBusy(false); }
  }
  return <div style={{ fontSize: 11, marginTop: 10 }}>
    <label><input type="checkbox" checked={granted} disabled={busy} onChange={event => void save(event.target.checked)} />{" "}
      {en ? "Mastering Lab downloads (permanent)" : "Mastering-Lab-Downloads (dauerhaft)"}</label>
    <div role="status">{message}</div>
  </div>;
}
