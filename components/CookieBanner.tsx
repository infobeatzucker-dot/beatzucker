"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "beatzucker_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) setVisible(true);

    // Listen for reopen event dispatched by Footer
    const handleReopen = () => setVisible(true);
    window.addEventListener("open-cookie-banner", handleReopen);
    return () => window.removeEventListener("open-cookie-banner", handleReopen);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
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
          background: "rgba(0,0,0,0.35)",
          zIndex: 9998,
          backdropFilter: "blur(2px)",
        }}
        onClick={accept}
      />

      {/* Banner */}
      <div
        role="dialog"
        aria-label="Cookie-Hinweis"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(560px, calc(100vw - 2rem))",
          background: "var(--bg-elevated, #1a1a2e)",
          border: "1px solid rgba(124,111,255,0.25)",
          borderRadius: "14px",
          padding: "1.5rem 1.75rem",
          zIndex: 9999,
          boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
          <span style={{ fontSize: "1.1rem" }}>🍪</span>
          <span style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "var(--text-primary, #fff)",
          }}>
            Cookie-Hinweis
          </span>
        </div>

        {/* Text */}
        <p style={{
          fontSize: "0.82rem",
          lineHeight: 1.65,
          color: "var(--text-secondary, #aaa)",
          marginBottom: "1.25rem",
        }}>
          Beatzucker verwendet ausschließlich{" "}
          <strong style={{ color: "var(--text-primary, #fff)" }}>technisch notwendige</strong>{" "}
          Cookies und lokalen Speicher — keine Tracking-Cookies, keine Werbung, kein Analytics.
          Deine Einstellungen (Plattform, Preset) werden nur lokal auf deinem Gerät gespeichert.{" "}
          <Link
            href="/datenschutz"
            style={{ color: "var(--accent-cyan, #06b6d4)", textDecoration: "none" }}
          >
            Datenschutzerklärung →
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
              background: "linear-gradient(135deg, var(--accent-purple, #7c6fff), var(--accent-cyan, #06b6d4))",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Verstanden
          </button>
        </div>
      </div>
    </>
  );
}
