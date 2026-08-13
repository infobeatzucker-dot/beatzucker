"use client";

import { useState, useEffect, FormEvent } from "react";
import { signIn } from "next-auth/react";

type View = "login" | "register" | "forgot" | "reset" | "forgot-sent" | "otp";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialView?: View;
  resetToken?: string;
}

// ── Shared input style ────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.85rem",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "var(--text-primary, #fff)",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem",
  background: "linear-gradient(135deg, var(--accent-purple, #a855f7), var(--accent-cyan, #06b6d4))",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
  letterSpacing: "0.02em",
};

const btnGoogle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "8px",
  color: "var(--text-primary, #fff)",
  fontWeight: 600,
  fontSize: "0.88rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
};

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--accent-cyan, #06b6d4)",
  fontSize: "0.82rem",
  cursor: "pointer",
  padding: 0,
  textDecoration: "underline",
};

const errStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  color: "#fca5a5",
  fontSize: "0.82rem",
};

const okStyle: React.CSSProperties = {
  background: "rgba(16,185,129,0.12)",
  border: "1px solid rgba(16,185,129,0.3)",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  color: "#6ee7b7",
  fontSize: "0.82rem",
};

// ── Google SVG icon ───────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.2-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.5 35.5 26.9 36.5 24 36.5c-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.7 39.8 16.4 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.6 6l6.2 5.2C41.7 35.7 44 30.2 44 24c0-1.3-.2-2.7-.4-4z"/>
    </svg>
  );
}

// ── AuthModal ─────────────────────────────────────────────────────────
export default function AuthModal({ open, onClose, initialView = "login", resetToken }: AuthModalProps) {
  const [view, setView]           = useState<View>(initialView);
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [otp, setOtp]             = useState("");

  // Switch to reset view if token is present
  useEffect(() => {
    if (resetToken) setView("reset");
  }, [resetToken]);

  useEffect(() => {
    if (open) { setError(""); setSuccess(""); }
  }, [open, view]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  if (!open) return null;

  // ── Google login ──────────────────────────────────────────────
  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  // ── Email + Password login ─────────────────────────────────────
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    // Check if 2FA is required
    const otpRes = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const otpData = await otpRes.json();
    if (!otpRes.ok) {
      setLoading(false);
      setError("E-Mail oder Passwort falsch.");
      return;
    }
    if (otpData.requiresOtp) {
      setLoading(false);
      setOtp("");
      setView("otp");
      return;
    }
    // No 2FA — proceed normally
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("E-Mail oder Passwort falsch.");
    } else {
      onClose();
    }
  }

  // ── OTP submit ─────────────────────────────────────────────────
  async function handleOtp(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await signIn("credentials", { email, password, otp, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Ungültiger oder abgelaufener Code.");
    } else {
      onClose();
    }
  }

  // ── Register ───────────────────────────────────────────────────
  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== password2) { setError("Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Fehler beim Registrieren."); return; }
    // Auto-login after register
    const loginRes = await signIn("credentials", { email, password, redirect: false });
    if (loginRes?.error) { setView("login"); setSuccess("Konto erstellt! Bitte einloggen."); }
    else onClose();
  }

  // ── Forgot password ────────────────────────────────────────────
  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forgot-password", email }),
    });
    setLoading(false);
    setView("forgot-sent");
  }

  // ── Reset password ─────────────────────────────────────────────
  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== password2) { setError("Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password", token: resetToken, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Fehler."); return; }
    setSuccess("Passwort geändert! Du kannst dich jetzt einloggen.");
    setView("login");
  }

  // ── Divider ────────────────────────────────────────────────────
  const Divider = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>oder</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, backdropFilter: "blur(3px)" }}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(420px, calc(100vw - 2rem))",
          background: "var(--bg-elevated, #1a1a2e)",
          border: "1px solid rgba(124,111,255,0.25)",
          borderRadius: "16px",
          padding: "2rem",
          zIndex: 9999,
          boxShadow: "0 16px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none",
                   color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}
          aria-label="Schließen"
        >✕</button>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "1.3rem", fontWeight: 800 }}>
            <span style={{ color: "var(--accent-purple)" }}>Up</span>
            <span style={{ color: "var(--accent-cyan)" }}>Ma</span>
            <span style={{ color: "#f59e0b" }}>Do</span>
          </span>
        </div>

        {error   && <div style={{ ...errStyle, marginBottom: "1rem" }}>{error}</div>}
        {success && <div style={{ ...okStyle, marginBottom: "1rem" }}>{success}</div>}

        {/* ── LOGIN ───────────────────────────────────────── */}
        {view === "login" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.25rem", textAlign: "center" }}>
              Anmelden
            </h2>
            <button style={btnGoogle} onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> Mit Google anmelden
            </button>
            <Divider />
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="login-email" className="sr-only">E-Mail</label>
              <input id="login-email" style={inputStyle} type="email" placeholder="E-Mail" value={email}
                     onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              <label htmlFor="login-pw" className="sr-only">Passwort</label>
              <input id="login-pw" style={inputStyle} type="password" placeholder="Passwort" value={password}
                     onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : "Einloggen"}
              </button>
            </form>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
              <button style={linkBtn} onClick={() => { setView("register"); setError(""); }}>Konto erstellen</button>
              <button style={linkBtn} onClick={() => { setView("forgot"); setError(""); }}>Passwort vergessen?</button>
            </div>
          </>
        )}

        {/* ── REGISTER ────────────────────────────────────── */}
        {view === "register" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.25rem", textAlign: "center" }}>
              Konto erstellen
            </h2>
            <button style={btnGoogle} onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> Mit Google registrieren
            </button>
            <Divider />
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="reg-email" className="sr-only">E-Mail</label>
              <input id="reg-email" style={inputStyle} type="email" placeholder="E-Mail" value={email}
                     onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              <label htmlFor="reg-pw" className="sr-only">Passwort</label>
              <input id="reg-pw" style={inputStyle} type="password" placeholder="Passwort (min. 8 Zeichen)" value={password}
                     onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              <label htmlFor="reg-pw2" className="sr-only">Passwort wiederholen</label>
              <input id="reg-pw2" style={inputStyle} type="password" placeholder="Passwort wiederholen" value={password2}
                     onChange={e => setPassword2(e.target.value)} required autoComplete="new-password" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : "Konto erstellen"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button style={linkBtn} onClick={() => { setView("login"); setError(""); }}>Bereits ein Konto? Einloggen</button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", textAlign: "center", marginTop: "0.75rem", lineHeight: 1.5 }}>
              Mit der Registrierung stimmst du unseren{" "}
              <a href="/agb" style={{ color: "var(--accent-cyan)" }} target="_blank">AGB</a> und der{" "}
              <a href="/datenschutz" style={{ color: "var(--accent-cyan)" }} target="_blank">Datenschutzerklärung</a> zu.
            </p>
          </>
        )}

        {/* ── FORGOT ──────────────────────────────────────── */}
        {view === "forgot" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem", textAlign: "center" }}>
              Passwort vergessen
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
              Wir senden dir einen Reset-Link per E-Mail.
            </p>
            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="forgot-email" className="sr-only">E-Mail</label>
              <input id="forgot-email" style={inputStyle} type="email" placeholder="Deine E-Mail" value={email}
                     onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : "Reset-Link senden"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button style={linkBtn} onClick={() => { setView("login"); setError(""); }}>← Zurück zum Login</button>
            </div>
          </>
        )}

        {/* ── FORGOT SENT ─────────────────────────────────── */}
        {view === "forgot-sent" && (
          <>
            <div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: "0.75rem" }}>📧</div>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.75rem", textAlign: "center" }}>
              E-Mail gesendet
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", lineHeight: 1.6 }}>
              Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze einen Reset-Link.
              Der Link ist <strong style={{ color: "#fff" }}>15 Minuten</strong> gültig.
            </p>
            <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
              <button style={linkBtn} onClick={() => { setView("login"); setError(""); }}>← Zum Login</button>
            </div>
          </>
        )}

        {/* ── OTP ─────────────────────────────────────────── */}
        {view === "otp" && (
          <>
            <div style={{ textAlign: "center", fontSize: "2rem", marginBottom: "0.5rem" }}>🔐</div>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem", textAlign: "center" }}>
              2-Faktor-Authentifizierung
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
              Wir haben einen 6-stelligen Code an <strong style={{ color: "#fff" }}>{email}</strong> gesendet.
            </p>
            <form onSubmit={handleOtp} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="otp-code" className="sr-only">6-stelliger Bestätigungscode</label>
              <input
                id="otp-code"
                style={{ ...inputStyle, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.3em", fontWeight: 700 }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                autoComplete="one-time-code"
              />
              <button style={btnPrimary} type="submit" disabled={loading || otp.length !== 6}>
                {loading ? "…" : "Bestätigen"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button style={linkBtn} onClick={() => { setView("login"); setError(""); setOtp(""); }}>← Zurück</button>
            </div>
          </>
        )}

        {/* ── RESET ───────────────────────────────────────── */}
        {view === "reset" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.25rem", textAlign: "center" }}>
              Neues Passwort setzen
            </h2>
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="reset-pw" className="sr-only">Neues Passwort</label>
              <input id="reset-pw" style={inputStyle} type="password" placeholder="Neues Passwort (min. 8 Zeichen)" value={password}
                     onChange={e => setPassword(e.target.value)} required autoFocus autoComplete="new-password" />
              <label htmlFor="reset-pw2" className="sr-only">Passwort wiederholen</label>
              <input id="reset-pw2" style={inputStyle} type="password" placeholder="Passwort wiederholen" value={password2}
                     onChange={e => setPassword2(e.target.value)} required autoComplete="new-password" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : "Passwort speichern"}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
