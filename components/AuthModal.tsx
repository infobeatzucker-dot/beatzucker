"use client";

import { useState, useEffect, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Mail, ShieldCheck } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import { TERMS_VERSION } from "@/lib/terms";

type View = "login" | "register" | "forgot" | "reset" | "forgot-sent" | "otp";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialView?: View;
  resetToken?: string;
  lang?: Lang;
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
  background: "linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-cyan, #38bdf8))",
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
  color: "var(--accent-cyan, #38bdf8)",
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
export default function AuthModal({ open, onClose, initialView = "login", resetToken, lang = "de" }: AuthModalProps) {
  const [view, setView]           = useState<View>(initialView);
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [otp, setOtp]             = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const en = lang === "en";
  const t = (de: string, english: string) => en ? english : de;
  const apiError = (message: unknown, fallback: string) => {
    if (typeof message !== "string") return fallback;
    const parts = message.split(" / ");
    return parts.length === 2 ? parts[en ? 0 : 1] : message;
  };
  const networkError = () => setError(t("Verbindung fehlgeschlagen. Bitte erneut versuchen.", "Connection failed. Please try again."));
  const home = en ? "/en" : "/";

  useEffect(() => {
    if (open) { setError(""); setSuccess(""); }
  }, [open]);

  useEffect(() => {
    setView(resetToken ? "reset" : initialView);
  }, [initialView, resetToken]);

  if (!open) return null;

  // ── Google login ──────────────────────────────────────────────
  async function handleGoogle() {
    if (!termsAccepted) {
      setError(en ? "Please accept the Terms of Service first." : "Bitte akzeptiere zuerst die AGB.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/consent", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, version: TERMS_VERSION, lang }) });
      if (!response.ok) throw Error();
      await signIn("google", { callbackUrl: home });
    }
    catch { networkError(); }
    finally { setLoading(false); }
  }

  // ── Email + Password login ─────────────────────────────────────
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
    // Check if 2FA is required
    const otpRes = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, lang }),
    });
    const otpData = await otpRes.json();
    if (!otpRes.ok) {
      setLoading(false);
      setError(otpRes.status === 429 ? t("Zu viele Versuche. Bitte später erneut versuchen.", "Too many attempts. Please try again later.")
        : otpRes.status >= 500 ? t("Anmeldung momentan nicht verfügbar. Bitte erneut versuchen.", "Sign-in is temporarily unavailable. Please try again.")
        : t("E-Mail oder Passwort falsch.", "Incorrect email or password."));
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
    if (!res || res.error) {
      setError(t("E-Mail oder Passwort falsch.", "Incorrect email or password."));
    } else {
      onClose();
    }
    } catch { networkError(); }
    finally { setLoading(false); }
  }

  // ── OTP submit ─────────────────────────────────────────────────
  async function handleOtp(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
    const res = await signIn("credentials", { email, password, otp, redirect: false });
    setLoading(false);
    if (!res || res.error) {
      setError(t("Ungültiger oder abgelaufener Code.", "Invalid or expired code."));
    } else {
      onClose();
    }
    } catch { networkError(); }
    finally { setLoading(false); }
  }

  // ── Register ───────────────────────────────────────────────────
  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!termsAccepted) { setError(en ? "Please accept the Terms of Service first." : "Bitte akzeptiere zuerst die AGB."); return; }
    if (password !== password2) { setError(t("Passwörter stimmen nicht überein.", "Passwords do not match.")); return; }
    setLoading(true);
    try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", email, password, lang, termsAccepted: true, termsVersion: TERMS_VERSION }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(apiError(data.error, t("Fehler beim Registrieren.", "Registration failed."))); return; }
    // Auto-login after register
    const loginRes = await signIn("credentials", { email, password, redirect: false });
    if (!loginRes || loginRes.error) { setView("login"); setSuccess(t("Konto erstellt! Bitte einloggen.", "Account created! Please sign in.")); }
    else onClose();
    } catch { networkError(); }
    finally { setLoading(false); }
  }

  // ── Forgot password ────────────────────────────────────────────
  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forgot-password", email, lang }),
    });
    if (!res.ok) { const data = await res.json(); setError(apiError(data.error, t("Anfrage fehlgeschlagen.", "Request failed."))); return; }
    setView("forgot-sent");
    } catch { networkError(); }
    finally { setLoading(false); }
  }

  // ── Reset password ─────────────────────────────────────────────
  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== password2) { setError(t("Passwörter stimmen nicht überein.", "Passwords do not match.")); return; }
    setLoading(true);
    try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password", token: resetToken, password, lang }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(apiError(data.error, t("Fehler.", "Request failed."))); return; }
    setSuccess(t("Passwort geändert! Du kannst dich jetzt einloggen.", "Password changed! You can now sign in."));
    setView("login");
    } catch { networkError(); }
    finally { setLoading(false); }
  }

  // ── Divider ────────────────────────────────────────────────────
  const Divider = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{t("oder", "or")}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
    </div>
  );
  const termsField = <label style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem", color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.5, marginBottom: "0.9rem" }}>
    <input type="checkbox" disabled={loading} checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} style={{ marginTop: "0.18rem" }} />
    <span>{t("Ich akzeptiere die ", "I accept the ")}<a href={en ? "/terms" : "/agb"} style={{ color: "var(--accent-cyan)" }} target="_blank" rel="noopener noreferrer">{t("AGB", "Terms of Service")}</a>. {t("Informationen zur Datenverarbeitung stehen in der ", "Information about data processing is available in the ")}<a href={en ? "/privacy" : "/datenschutz"} style={{ color: "var(--accent-cyan)" }} target="_blank" rel="noopener noreferrer">{t("Datenschutzerklärung", "Privacy Policy")}</a>.</span>
  </label>;

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
        aria-label={t("Anmeldung und Konto", "Sign-in and account")}
        lang={lang}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(420px, calc(100vw - 2rem))",
          background: "var(--bg-elevated, #1a1a2e)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: "16px",
          padding: "2rem",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          zIndex: 9999,
          boxShadow: "0 16px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none",
                   color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}
          aria-label={t("Schließen", "Close")}
        >✕</button>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "1.3rem", fontWeight: 800 }}>
            <span style={{ color: "var(--accent-purple)" }}>Beat</span>
            <span style={{ color: "var(--accent-cyan)" }}>zucker</span>
          </span>
        </div>

        {error   && <div role="alert" style={{ ...errStyle, marginBottom: "1rem" }}>{error}</div>}
        {success && <div role="status" style={{ ...okStyle, marginBottom: "1rem" }}>{success}</div>}

        {/* ── LOGIN ───────────────────────────────────────── */}
        {view === "login" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.25rem", textAlign: "center" }}>
              {t("Anmelden", "Sign in")}
            </h2>
            {termsField}
            <button style={btnGoogle} onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> {t("Mit Google anmelden", "Sign in with Google")}
            </button>
            <Divider />
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="login-email" className="sr-only">{t("E-Mail", "Email")}</label>
              <input id="login-email" style={inputStyle} type="email" placeholder={t("E-Mail", "Email")} value={email}
                     onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              <label htmlFor="login-pw" className="sr-only">{t("Passwort", "Password")}</label>
              <input id="login-pw" style={inputStyle} type="password" placeholder={t("Passwort", "Password")} value={password}
                     onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : t("Einloggen", "Sign in")}
              </button>
            </form>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
              <button style={linkBtn} disabled={loading} onClick={() => { setView("register"); setError(""); setSuccess(""); }}>{t("Konto erstellen", "Create account")}</button>
              <button style={linkBtn} disabled={loading} onClick={() => { setView("forgot"); setError(""); setSuccess(""); }}>{t("Passwort vergessen?", "Forgot password?")}</button>
            </div>
          </>
        )}

        {/* ── REGISTER ────────────────────────────────────── */}
        {view === "register" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.25rem", textAlign: "center" }}>
              {t("Konto erstellen", "Create account")}
            </h2>
            {termsField}
            <button style={btnGoogle} onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> {t("Mit Google registrieren", "Register with Google")}
            </button>
            <Divider />
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="reg-email" className="sr-only">{t("E-Mail", "Email")}</label>
              <input id="reg-email" style={inputStyle} type="email" placeholder={t("E-Mail", "Email")} value={email}
                     onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              <label htmlFor="reg-pw" className="sr-only">{t("Passwort", "Password")}</label>
              <input id="reg-pw" style={inputStyle} type="password" placeholder={t("Passwort (min. 8 Zeichen)", "Password (at least 8 characters)")} value={password}
                     onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              <label htmlFor="reg-pw2" className="sr-only">{t("Passwort wiederholen", "Repeat password")}</label>
              <input id="reg-pw2" style={inputStyle} type="password" placeholder={t("Passwort wiederholen", "Repeat password")} value={password2}
                     onChange={e => setPassword2(e.target.value)} required autoComplete="new-password" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : t("Konto erstellen", "Create account")}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button style={linkBtn} disabled={loading} onClick={() => { setView("login"); setError(""); setSuccess(""); }}>{t("Bereits ein Konto? Einloggen", "Already have an account? Sign in")}</button>
            </div>
          </>
        )}

        {/* ── FORGOT ──────────────────────────────────────── */}
        {view === "forgot" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem", textAlign: "center" }}>
              {t("Passwort vergessen", "Forgot password")}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
              {t("Wir senden dir einen Reset-Link per E-Mail.", "We'll email you a password reset link.")}
            </p>
            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="forgot-email" className="sr-only">{t("E-Mail", "Email")}</label>
              <input id="forgot-email" style={inputStyle} type="email" placeholder={t("Deine E-Mail", "Your email")} value={email}
                     onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : t("Reset-Link senden", "Send reset link")}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button style={linkBtn} disabled={loading} onClick={() => { setView("login"); setError(""); }}>{t("← Zurück zum Login", "← Back to sign-in")}</button>
            </div>
          </>
        )}

        {/* ── FORGOT SENT ─────────────────────────────────── */}
        {view === "forgot-sent" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
              <Mail size={40} strokeWidth={1.75} color="var(--accent-cyan, #38bdf8)" />
            </div>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.75rem", textAlign: "center" }}>
              {t("Anfrage erhalten", "Request received")}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", lineHeight: 1.6 }}>
              {t("Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze einen Reset-Link. Der Link ist ", "If an account with this email exists, you'll receive a reset link shortly. The link is valid for ")}
              <strong style={{ color: "#fff" }}>{t("15 Minuten", "15 minutes")}</strong>.
            </p>
            <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
              <button style={linkBtn} onClick={() => { setView("login"); setError(""); }}>{t("← Zum Login", "← Sign in")}</button>
            </div>
          </>
        )}

        {/* ── OTP ─────────────────────────────────────────── */}
        {view === "otp" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
              <ShieldCheck size={32} strokeWidth={1.75} color="var(--accent-purple, #8b5cf6)" />
            </div>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem", textAlign: "center" }}>
              {t("2-Faktor-Authentifizierung", "Two-factor authentication")}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
              {t("Wir haben einen 6-stelligen Code an ", "We've sent a six-digit code to ")}<strong style={{ color: "#fff" }}>{email}</strong>.
            </p>
            <form onSubmit={handleOtp} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="otp-code" className="sr-only">{t("6-stelliger Bestätigungscode", "Six-digit verification code")}</label>
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
                {loading ? "…" : t("Bestätigen", "Verify")}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button style={linkBtn} disabled={loading} onClick={() => { setView("login"); setError(""); setOtp(""); }}>{t("← Zurück", "← Back")}</button>
            </div>
          </>
        )}

        {/* ── RESET ───────────────────────────────────────── */}
        {view === "reset" && (
          <>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.25rem", textAlign: "center" }}>
              {t("Neues Passwort setzen", "Set a new password")}
            </h2>
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label htmlFor="reset-pw" className="sr-only">{t("Neues Passwort", "New password")}</label>
              <input id="reset-pw" style={inputStyle} type="password" placeholder={t("Neues Passwort (min. 8 Zeichen)", "New password (at least 8 characters)")} value={password}
                     onChange={e => setPassword(e.target.value)} required autoFocus autoComplete="new-password" />
              <label htmlFor="reset-pw2" className="sr-only">{t("Passwort wiederholen", "Repeat password")}</label>
              <input id="reset-pw2" style={inputStyle} type="password" placeholder={t("Passwort wiederholen", "Repeat password")} value={password2}
                     onChange={e => setPassword2(e.target.value)} required autoComplete="new-password" />
              <button style={btnPrimary} type="submit" disabled={loading}>
                {loading ? "…" : t("Passwort speichern", "Save password")}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
