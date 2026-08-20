"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { ArrowRight, User, Coffee } from "lucide-react";
import AuthModal from "./AuthModal";
import AccountDropdown from "./AccountDropdown";
import DonateButton from "./DonateButton";
import { subscribeGlobalAudioState, toggleGlobalAudio, getGlobalAudioState } from "@/lib/globalAudio";
import { DONATE_URL } from "@/lib/constants";
import type { Lang } from "@/lib/types/mastering";

export default function Header({ lang = "de" }: { lang?: Lang }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [authOpen, setAuthOpen]   = useState(false);
  const [resetToken, setResetToken] = useState<string | undefined>();
  const [audioState, setAudioState] = useState(() => getGlobalAudioState());

  const { data: session } = useSession();

  // Subscribe to global audio state
  useEffect(() => {
    return subscribeGlobalAudioState(setAudioState);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-open reset modal if ?reset=token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("reset");
    if (token) {
      setResetToken(token);
      setAuthOpen(true);
    }
  }, []);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(5, 8, 22, 0.9)" : "rgba(5, 8, 22, 0.42)",
          backdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(139,92,246,0.18)"
            : "1px solid rgba(255,255,255,0.04)",
          boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.4)" : "none",
        }}
      >
        <div className="header-inner">

          {/* Logo */}
          <Link href="/" className="brand-lockup" style={{ textDecoration: "none" }}>
            <span className="brand-wave" aria-hidden="true">
              {[10, 22, 32, 18, 26, 12].map((height, index) => <i key={index} style={{ height }} />)}
            </span>
            <span className="font-black text-xl tracking-tight brand-name">
              Beatzucker
            </span>
            <span
              className="hidden sm:block text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{
                background: "rgba(139,92,246,0.15)",
                color: "var(--accent-purple)",
                border: "1px solid rgba(139,92,246,0.25)",
                letterSpacing: "0.05em",
              }}
            >
              BETA
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center header-nav">
            {[
              { label: lang === "de" ? "Startseite" : "Home", href: "/" },
              { label: lang === "de" ? "Funktionen" : "Features", href: "/features" },
              { label: lang === "de" ? "So funktioniert's" : "How it works", href: "/#features" },
              { label: lang === "de" ? "Wissen" : "Knowledge", href: "/ressourcen" },
              { label: "FAQ", href: "/help" },
              ...(session ? [{ label: "Dashboard", href: "/dashboard" }] : []),
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm transition-colors hover:text-white nav-link"
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className="hidden xl:block"><DonateButton variant="nav" lang={lang} /></span>
            {/* Global audio play/pause — visible whenever the player is loaded */}
            {audioState.available && (
              <button
                onClick={toggleGlobalAudio}
                title={audioState.playing ? (lang === "de" ? "Pausieren" : "Pause") : (lang === "de" ? "Abspielen" : "Play")}
                style={{
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  padding: "0.3rem 0.7rem", borderRadius: "20px",
                  background: audioState.playing
                    ? "rgba(56,189,248,0.12)"
                    : "rgba(255,255,255,0.06)",
                  border: audioState.playing
                    ? "1px solid rgba(56,189,248,0.35)"
                    : "1px solid rgba(255,255,255,0.12)",
                  color: audioState.playing ? "var(--accent-cyan)" : "var(--text-muted)",
                  fontSize: "0.75rem", fontWeight: 700,
                  cursor: "pointer",
                  animation: audioState.playing ? "pulse 2s infinite" : "none",
                  transition: "all 0.2s",
                }}
              >
                {audioState.playing ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                      <rect x="1" y="1" width="3" height="8" rx="1"/>
                      <rect x="6" y="1" width="3" height="8" rx="1"/>
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                      <path d="M2 1.5l7 3.5-7 3.5V1.5z"/>
                    </svg>
                    Play
                  </>
                )}
              </button>
            )}
            {/* Show session-aware content; during loading show guest buttons as fallback */}
            {session
              ? <AccountDropdown lang={lang} />
              : (
                <>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="text-sm px-3 py-1.5 rounded-lg transition-all font-medium"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {lang === "de" ? "Anmelden" : "Sign in"}
                  </button>
                </>
              )
            }

            <a href="/#mastering" className="neon-cta header-cta hidden lg:inline-flex">
              {lang === "de" ? "Jetzt mastern" : "Master now"} <ArrowRight size={15} aria-hidden="true" />
            </a>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={lang === "de" ? "Menü" : "Menu"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                {menuOpen ? (
                  <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                ) : (
                  <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                )}
              </svg>
            </button>
          </div>{/* end right-side flex */}
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                background: "rgba(8,10,15,0.97)",
                borderTop: "1px solid rgba(139,92,246,0.12)",
                overflow: "hidden",
              }}
            >
              <div className="px-4 py-5 flex flex-col gap-4">
                {[
                  { label: lang === "de" ? "Startseite" : "Home", href: "/" },
                  { label: lang === "de" ? "Funktionen" : "Features", href: "/features" },
                  { label: lang === "de" ? "Hilfe" : "Help", href: "/help" },
                  { label: lang === "de" ? "Wissen" : "Knowledge", href: "/ressourcen" },
                  { label: lang === "de" ? "Impressum" : "Legal notice", href: "/impressum" },
                  { label: lang === "de" ? "Datenschutz" : "Privacy", href: lang === "de" ? "/datenschutz" : "/privacy" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-sm"
                    style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {session ? (
                  <Link href="/dashboard" className="text-sm flex items-center gap-1.5"
                    style={{ color: "var(--accent-purple)", textDecoration: "none" }}
                    onClick={() => setMenuOpen(false)}>
                    <User size={14} strokeWidth={2} /> Dashboard
                  </Link>
                ) : (
                  <button
                    className="text-sm text-left"
                    style={{ background: "none", border: "none", color: "var(--accent-cyan)",
                             cursor: "pointer", padding: 0 }}
                    onClick={() => { setMenuOpen(false); setAuthOpen(true); }}
                  >
                    {lang === "de" ? "Anmelden / Registrieren" : "Sign in / Register"}
                  </button>
                )}
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1.5"
                  style={{ color: "var(--accent-gold)", textDecoration: "none" }}
                  onClick={() => setMenuOpen(false)}
                >
                  <Coffee size={14} strokeWidth={2} /> {lang === "de" ? "Beatzucker unterstützen" : "Support Beatzucker"}
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        onClose={() => { setAuthOpen(false); setResetToken(undefined); }}
        resetToken={resetToken}
      />
    </>
  );
}
