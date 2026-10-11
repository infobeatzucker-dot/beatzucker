"use client";

import { useEffect, useState, FormEvent } from "react";
import { signIn, signOut } from "next-auth/react";
import { useUiLanguage } from "@/lib/useUiLanguage";

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
  const lang = useUiLanguage();
  const en = lang === "en";
  const t = (de: string, english: string) => en ? english : de;
  const errorText = (value: unknown) => {
    if (typeof value !== "string") return t("Aktion fehlgeschlagen.", "Action failed.");
    const parts = value.split(" / ");
    if (parts.length === 2) {
      return parts[en ? 0 : 1];
    }
    return value;
  };
  const [data, setData] = useState<AccountData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [editName, setEditName] = useState("");
  const [nameMsg, setNameMsg] = useState("");

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const [twoFactorMsg, setTwoFactorMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [otp, setOtp] = useState("");
  const [securityMsg, setSecurityMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function accountAction(method: "PATCH" | "DELETE", body: object) {
    if (busy) return null;
    setBusy(true); setSecurityMsg("");
    try {
      const response = await fetch("/api/account", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, lang }),
      });
      const result = await response.json();
      if (!response.ok) { setSecurityMsg(errorText(result.error)); return null; }
      setCurPw(""); setOtp("");
      return result;
    } catch { setSecurityMsg(t("Verbindung fehlgeschlagen. Bitte erneut versuchen.", "Connection failed. Please try again.")); return null; }
    finally { setBusy(false); }
  }

  async function sendCode() {
    if (busy || !curPw) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data?.user.email, password: curPw, lang }),
      });
      const result = await response.json();
      setSecurityMsg(response.ok ? t("✓ Code versendet. Bitte Postfach prüfen (10 Minuten gültig).", "✓ Code sent. Check your inbox (valid for 10 minutes).") : errorText(result.error));
    } catch { setSecurityMsg(t("Verbindung fehlgeschlagen. Bitte erneut versuchen.", "Connection failed. Please try again.")); }
    finally { setBusy(false); }
  }

  function confirmationFields(includePassword = true) {
    return <div style={{ display: "grid", gap: "0.65rem", margin: "0.75rem 0" }}>
      {includePassword && <label>{t("Aktuelles Passwort", "Current password")}
        <input style={inputSty} aria-label={t("Passwort zur Bestätigung", "Confirmation password")} type="password" autoComplete="current-password" maxLength={128} value={curPw} onChange={e => setCurPw(e.target.value)} />
      </label>}
      {data?.twoFactor && <>
        <button type="button" disabled={busy || !curPw} onClick={sendCode} className="btn-secondary">{t("E-Mail-Code senden", "Send email code")}</button>
        <label>{t("E-Mail-Code", "Email code")}
          <input style={inputSty} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
        </label>
      </>}
    </div>;
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("confirmDelete") === "1") setDeleteConfirm(true);
    fetch("/api/account")
      .then(async (r) => { if (!r.ok) throw Error(); return r.json(); })
      .then((d) => { if (!d.user?.email) throw Error(); setData(d); setEditName(d.user.name ?? ""); })
      .catch(() => setLoadFailed(true));
  }, []);

  async function toggleTwoFactor() {
    const current = data?.twoFactor ?? false;
    const result = await accountAction("PATCH", { twoFactor: !current, currentPassword: curPw, otp });
    if (result) {
      setData((d) => d ? { ...d, twoFactor: !current } : d);
      setTwoFactorMsg(!current ? t("✓ 2FA aktiviert", "✓ 2FA enabled") : t("✓ 2FA deaktiviert", "✓ 2FA disabled"));
    }
    setTimeout(() => setTwoFactorMsg(""), 3000);
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const result = await accountAction("PATCH", { name: editName });
    setNameMsg(result ? t("✓ Name gespeichert", "✓ Name saved") : t("Fehler beim Speichern", "Saving failed"));
    setTimeout(() => setNameMsg(""), 3000);
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (newPw !== newPw2) { setPwMsg(t("Passwörter stimmen nicht überein.", "Passwords do not match.")); return; }
    const result = await accountAction("PATCH", { currentPassword: curPw, newPassword: newPw, otp });
    if (result) {
      setNewPw(""); setNewPw2("");
      await signOut({ callbackUrl: `${en ? "/en" : "/"}?passwordChanged=1` });
    }
    setTimeout(() => setPwMsg(""), 4000);
  }

  async function handleExportDownload() {
    if (busy) return;
    setBusy(true);
    try {
    const res = await fetch("/api/account/export");
    if (!res.ok) throw Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beatzucker-daten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    } catch { setSecurityMsg(t("Datenexport fehlgeschlagen. Bitte erneut versuchen.", "Data export failed. Please try again.")); }
    finally { setBusy(false); }
  }

  async function deleteAccount() {
    const result = await accountAction("DELETE", { currentPassword: curPw, otp });
    if (result) await signOut({ callbackUrl: en ? "/en" : "/" });
  }

  if (!data) {
    return <p role="status" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{loadFailed ? t("Profil konnte nicht geladen werden. Bitte die Seite neu laden.", "Your profile could not be loaded. Please reload this page.") : t("Lädt…", "Loading…")}</p>;
  }

  const pct = data.dailyLimit > 0 ? Math.min(100, Math.round((data.dailyUsed / data.dailyLimit) * 100)) : 0;

  return (
    <div lang={lang}>
      {securityMsg && <p role="status" style={{ ...msgStyle(securityMsg), position: "sticky", top: "1rem", zIndex: 10, background: "var(--bg-elevated, #1a1a2e)", padding: "0.8rem", borderRadius: 8 }}>{securityMsg}</p>}
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{data.user.email}</p>

      {section(t("Nutzung", "Usage"), (
        <>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            {t(`Alle Funktionen sind kostenlos. Zum Schutz vor Serverüberlastung sind derzeit ${data.dailyLimit} Masterings pro Tag möglich.`, `All features are free. To avoid server overload, you can currently create ${data.dailyLimit} masters per day.`)}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            <span>{t("Masters heute", "Masters today")}</span>
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

      {section(t("Profil", "Profile"), (
        <form onSubmit={saveName} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="profile-name" style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>{t("Anzeigename", "Display name")}</label>
            <input id="profile-name" style={inputSty} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t("Dein Name", "Your name")} maxLength={80} />
          </div>
          <button type="submit" disabled={busy} style={{ padding: "0.55rem 1.25rem", borderRadius: "7px", border: "none", background: "rgba(139,92,246,0.2)", color: "var(--accent-purple)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>{t("Speichern", "Save")}</button>
          {nameMsg && <div style={{ width: "100%", ...msgStyle(nameMsg) }}>{nameMsg}</div>}
        </form>
      ))}

      {data.user.hasPassword && section(t("Passwort ändern", "Change password"), (
        <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <input style={inputSty} type="password" autoComplete="current-password" aria-label={t("Aktuelles Passwort", "Current password")} placeholder={t("Aktuelles Passwort", "Current password")} value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
          <input style={inputSty} type="password" autoComplete="new-password" aria-label={t("Neues Passwort", "New password")} placeholder={t("Neues Passwort (min. 8 Zeichen)", "New password (at least 8 characters)")} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          <input style={inputSty} type="password" autoComplete="new-password" aria-label={t("Neues Passwort wiederholen", "Repeat new password")} placeholder={t("Neues Passwort wiederholen", "Repeat new password")} value={newPw2} onChange={(e) => setNewPw2(e.target.value)} required />
          {confirmationFields(false)}
          <button type="submit" disabled={busy || (data.twoFactor && otp.length !== 6)} style={{ padding: "0.55rem 1.25rem", borderRadius: "7px", border: "none", width: "fit-content", background: "rgba(139,92,246,0.2)", color: "var(--accent-purple)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>{t("Passwort ändern", "Change password")}</button>
          {pwMsg && <div style={msgStyle(pwMsg)}>{pwMsg}</div>}
        </form>
      ))}

      {data.user.hasPassword && section(t("Sicherheit", "Security"), (
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{t("Bitte die Änderung mit deinem Passwort bestätigen. Bei aktiver 2FA ist zusätzlich ein E-Mail-Code erforderlich.", "Confirm the change with your password. If 2FA is enabled, an email code is also required.")}</p>
          {confirmationFields()}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", margin: "0 0 0.25rem", fontWeight: 600 }}>{t("2-Faktor-Authentifizierung", "Two-factor authentication")}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                {data.twoFactor ? t("Aktiv — du erhältst bei jedem Login einen Code per E-Mail.", "Enabled — you'll receive an email code each time you sign in.") : t("Deaktiviert — aktiviere es für mehr Sicherheit.", "Disabled — enable it for additional security.")}
              </p>
            </div>
            <button
              onClick={toggleTwoFactor}
              disabled={busy || !curPw || (data.twoFactor && otp.length !== 6)}
              style={{
                padding: "0.45rem 1rem", borderRadius: "7px", border: "none",
                background: data.twoFactor ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                color: data.twoFactor ? "#f87171" : "#6ee7b7",
                fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", flexShrink: 0,
              }}
            >
              {data.twoFactor ? t("Deaktivieren", "Disable") : t("Aktivieren", "Enable")}
            </button>
          </div>
          {twoFactorMsg && <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: twoFactorMsg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>{twoFactorMsg}</p>}
        </div>
      ))}

      {section(t("Datenschutz", "Privacy"), (
        <div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {t("Hier kannst du deine Kontodaten und Mastering-Informationen herunterladen. Passwörter und Sicherheitscodes sind nicht enthalten.", "Download your account data and mastering information here. Passwords and security codes are not included.")}
          </p>
          <button
            onClick={handleExportDownload}
            disabled={busy}
            style={{ display: "inline-block", padding: "0.5rem 1.1rem", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "var(--accent-purple)", borderRadius: "7px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            {t("Meine Daten exportieren (JSON)", "Export my data (JSON)")}
          </button>
        </div>
      ))}

      {section(t("Gefahrenzone", "Danger zone"), (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "7px", padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600, width: "fit-content" }}
            >
              {t("Konto löschen", "Delete account")}
            </button>
          ) : (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#fca5a5", marginBottom: "0.75rem" }}>
                <strong>{t("Wirklich löschen?", "Are you sure?")}</strong> {t("Dein Konto und deine Mastering-Daten werden entfernt. Gesetzlich aufzubewahrende Nachweise bleiben erhalten. Ein laufendes Mastering muss zuerst beendet sein.", "Your account and mastering data will be removed. Records subject to legal retention will be kept. Any running master must finish first.")}
              </p>
              {data.user.hasPassword ? confirmationFields() : <>
                <p>{t("Bitte vor dem Löschen erneut mit Google bestätigen (5 Minuten gültig).", "Confirm through Google again before deletion (valid for 5 minutes).")}</p>
                <button type="button" disabled={busy} className="btn-secondary" onClick={() => signIn("google", { callbackUrl: `${window.location.origin}/dashboard/profile?confirmDelete=1&lang=${lang}` }, { prompt: "select_account" })}>{t("Mit Google erneut bestätigen", "Confirm through Google again")}</button>
              </>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={deleteAccount} disabled={busy || (data.user.hasPassword && (!curPw || (data.twoFactor && otp.length !== 6)))} style={{ background: "#ef4444", border: "none", color: "#fff", borderRadius: "6px", padding: "0.45rem 0.9rem", fontSize: "0.82rem", cursor: "pointer", fontWeight: 700 }}>{t("Ja, Konto löschen", "Yes, delete account")}</button>
                <button disabled={busy} onClick={() => setDeleteConfirm(false)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)", borderRadius: "6px", padding: "0.45rem 0.9rem", fontSize: "0.82rem", cursor: "pointer" }}>{t("Abbrechen", "Cancel")}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
