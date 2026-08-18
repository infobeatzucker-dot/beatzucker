"use client";

import { useEffect, useState, FormEvent } from "react";
import { signOut } from "next-auth/react";

interface AccountData {
  user: { id: string; email: string; name: string | null; image: string | null; hasPassword: boolean; createdAt: string };
  twoFactor: boolean;
  dailyUsed: number;
  dailyLimit: number;
}

const section = (title: string, children: React.ReactNode) => (
  <section
    key={title}
    style={{
      background: "var(--bg-elevated, #1a1a2e)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "var(--radius-md)",
      padding: "1.5rem",
      marginBottom: "1.5rem",
    }}
  >
    <h2 style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent-purple)", marginBottom: "1.25rem" }}>{title}</h2>
    {children}
  </section>
);

const inputSty: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.8rem",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "7px", color: "var(--text-primary, #fff)", fontSize: "0.88rem",
  outline: "none", boxSizing: "border-box",
};

const msgStyle = (msg: string): React.CSSProperties => ({
  fontSize: "0.8rem", marginTop: "0.4rem",
  color: msg.startsWith("✓") ? "#6ee7b7" : "#fca5a5",
});

export default function ProfileSettings() {
  const [data, setData] = useState<AccountData | null>(null);

  const [editName, setEditName] = useState("");
  const [nameMsg, setNameMsg] = useState("");

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const [twoFactorMsg, setTwoFactorMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => { setData(d); setEditName(d.user?.name ?? ""); })
      .catch(() => {});
  }, []);

  async function toggleTwoFactor() {
    const current = data?.twoFactor ?? false;
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twoFactor: !current }),
    });
    if (res.ok) {
      setData((d) => d ? { ...d, twoFactor: !current } : d);
      setTwoFactorMsg(!current ? "✓ 2FA aktiviert" : "✓ 2FA deaktiviert");
    } else {
      setTwoFactorMsg("Fehler beim Speichern");
    }
    setTimeout(() => setTwoFactorMsg(""), 3000);
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setNameMsg(res.ok ? "✓ Name gespeichert" : "Fehler beim Speichern");
    setTimeout(() => setNameMsg(""), 3000);
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (newPw !== newPw2) { setPwMsg("Passwörter stimmen nicht überein."); return; }
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const d = await res.json();
    setPwMsg(res.ok ? "✓ Passwort geändert" : (d.error ?? "Fehler"));
    if (res.ok) { setCurPw(""); setNewPw(""); setNewPw2(""); }
    setTimeout(() => setPwMsg(""), 4000);
  }

  async function handleExportDownload() {
    const res = await fetch("/api/account/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beatzucker-daten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) await signOut({ callbackUrl: "/" });
  }

  if (!data) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Lädt…</p>;
  }

  const pct = Math.min(100, Math.round((data.dailyUsed / data.dailyLimit) * 100));

  return (
    <div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{data.user.email}</p>

      {section("Nutzung", (
        <>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Alle Funktionen sind kostenlos und unbegrenzt nutzbar. Ein faires Tageslimit schützt lediglich vor Serverüberlastung.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            <span>Masters heute</span>
            <span style={{ color: pct >= 90 ? "#f87171" : "var(--text-primary)" }}>{data.dailyUsed} / {data.dailyLimit}</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
            <div style={{
              width: `${pct}%`, height: "100%", borderRadius: 3,
              background: pct >= 90 ? "linear-gradient(90deg, #f87171, #ef4444)" : "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))",
            }} />
          </div>
        </>
      ))}

      {section("Profil", (
        <form onSubmit={saveName} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Anzeigename</label>
            <input style={inputSty} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Dein Name" maxLength={80} />
          </div>
          <button type="submit" style={{ padding: "0.55rem 1.25rem", borderRadius: "7px", border: "none", background: "rgba(139,92,246,0.2)", color: "var(--accent-purple)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Speichern</button>
          {nameMsg && <div style={{ width: "100%", ...msgStyle(nameMsg) }}>{nameMsg}</div>}
        </form>
      ))}

      {data.user.hasPassword && section("Passwort ändern", (
        <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <input style={inputSty} type="password" placeholder="Aktuelles Passwort" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
          <input style={inputSty} type="password" placeholder="Neues Passwort (min. 8 Zeichen)" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          <input style={inputSty} type="password" placeholder="Neues Passwort wiederholen" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} required />
          <button type="submit" style={{ padding: "0.55rem 1.25rem", borderRadius: "7px", border: "none", width: "fit-content", background: "rgba(139,92,246,0.2)", color: "var(--accent-purple)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Passwort ändern</button>
          {pwMsg && <div style={msgStyle(pwMsg)}>{pwMsg}</div>}
        </form>
      ))}

      {data.user.hasPassword && section("Sicherheit", (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", margin: "0 0 0.25rem", fontWeight: 600 }}>2-Faktor-Authentifizierung</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                {data.twoFactor ? "Aktiv — du erhältst bei jedem Login einen Code per E-Mail." : "Deaktiviert — aktiviere es für mehr Sicherheit."}
              </p>
            </div>
            <button
              onClick={toggleTwoFactor}
              style={{
                padding: "0.45rem 1rem", borderRadius: "7px", border: "none",
                background: data.twoFactor ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                color: data.twoFactor ? "#f87171" : "#6ee7b7",
                fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", flexShrink: 0,
              }}
            >
              {data.twoFactor ? "Deaktivieren" : "Aktivieren"}
            </button>
          </div>
          {twoFactorMsg && <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: twoFactorMsg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>{twoFactorMsg}</p>}
        </div>
      ))}

      {section("Datenschutz", (
        <div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Gemäß DSGVO Art. 20 kannst du alle gespeicherten Daten herunterladen.
          </p>
          <button
            onClick={handleExportDownload}
            style={{ display: "inline-block", padding: "0.5rem 1.1rem", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "var(--accent-purple)", borderRadius: "7px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            Meine Daten exportieren (JSON)
          </button>
        </div>
      ))}

      {section("Gefahrenzone", (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "7px", padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600, width: "fit-content" }}
            >
              Konto löschen
            </button>
          ) : (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#fca5a5", marginBottom: "0.75rem" }}>
                <strong>Wirklich löschen?</strong> Alle Daten werden unwiderruflich entfernt.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={deleteAccount} style={{ background: "#ef4444", border: "none", color: "#fff", borderRadius: "6px", padding: "0.45rem 0.9rem", fontSize: "0.82rem", cursor: "pointer", fontWeight: 700 }}>Ja, Konto löschen</button>
                <button onClick={() => setDeleteConfirm(false)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)", borderRadius: "6px", padding: "0.45rem 0.9rem", fontSize: "0.82rem", cursor: "pointer" }}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
