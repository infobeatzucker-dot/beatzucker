"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "beatzucker_cookie_consent";

export default function CookieBanner() {
  const pathname = usePathname();
  const [accountEnglish, setAccountEnglish] = useState(false);
  const en = pathname === "/en" || pathname.startsWith("/en/") || ["/privacy", "/terms", "/legal-notice", "/cancellation-policy"].includes(pathname)
    || ((pathname.startsWith("/dashboard") || pathname === "/account") && accountEnglish);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    let saved: string | null = null;
    try { saved = localStorage.getItem("beatzucker-language"); } catch { /* optional */ }
    setAccountEnglish(requested === "en" || (requested !== "de" && saved === "en"));
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    let accepted: string | null = null;
    try { accepted = localStorage.getItem(STORAGE_KEY); } catch { /* Storage can be unavailable in private browsing. */ }
    if (!accepted) setVisible(true);

    // Listen for reopen event dispatched by Footer
    const handleReopen = () => setVisible(true);
    window.addEventListener("open-cookie-banner", handleReopen);
    return () => window.removeEventListener("open-cookie-banner", handleReopen);
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* The notice can still be dismissed for this visit. */ }
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return (
    <>
      {/* Backdrop (subtle) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(var(--bz-paint-000000),0.35)",
          zIndex: 9998,
          backdropFilter: "blur(2px)",
        }}
        onClick={accept}
      />

      {/* Banner */}
      <div
        role="dialog"
        aria-label={en ? "Cookie information" : "Cookie-Hinweis"}
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(560px, calc(100vw - 2rem))",
          background: "var(--bg-elevated, rgb(var(--bz-paint-1a1a2e)))",
          border: "1px solid rgba(var(--bz-border-8b5cf6),0.25)",
          borderRadius: "14px",
          padding: "1.5rem 1.75rem",
          zIndex: 9999,
          boxShadow: "0 8px 40px rgba(var(--bz-shadow-000000),0.55), 0 0 0 1px rgba(var(--bz-shadow-ffffff),0.04)",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
          <Cookie size={17} strokeWidth={2} color="var(--accent-gold, rgb(var(--bz-paint-c4b5fd)))" />
          <span style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "var(--text-primary, rgb(var(--bz-paint-ffffff)))",
          }}>
            {en ? "Cookie information" : "Cookie-Hinweis"}
          </span>
        </div>

        {/* Text */}
        <p style={{
          fontSize: "0.82rem",
          lineHeight: 1.65,
          color: "var(--text-secondary, rgb(var(--bz-paint-aaaaaa)))",
          marginBottom: "1.25rem",
        }}>
          {en ? "Beatzucker uses only " : "Beatzucker verwendet ausschließlich "}
          <strong style={{ color: "var(--text-primary, rgb(var(--bz-paint-ffffff)))" }}>{en ? "strictly necessary" : "technisch notwendige"}</strong>{" "}
          {en
            ? "cookies and local storage — no tracking cookies, advertising or analytics. Language preference and acknowledgement of this notice remain only on your device. "
            : "Cookies und lokalen Speicher — keine Tracking-Cookies, keine Werbung, kein Analytics. Sprachwahl und Bestätigung dieses Hinweises bleiben nur auf deinem Gerät. "}
          <Link
            href={en ? "/privacy" : "/datenschutz"}
            style={{ color: "var(--accent-cyan, rgb(var(--bz-paint-38bdf8)))", textDecoration: "none" }}
          >
            {en ? "Privacy Policy →" : "Datenschutzerklärung →"}
          </Link>
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={accept}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, var(--accent-purple, rgb(var(--bz-paint-8b5cf6))), var(--accent-cyan, rgb(var(--bz-paint-38bdf8))))",
              color: "rgb(var(--bz-paint-ffffff))",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {en ? "Understood" : "Verstanden"}
          </button>
        </div>
      </div>
    </>
  );
}
