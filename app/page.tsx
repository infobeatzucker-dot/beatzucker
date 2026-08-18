"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Gift, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import MasteringWorkspace from "@/components/MasteringWorkspace";
import FeaturesSection from "@/components/FeaturesSection";
import BeforeAfterShowcase from "@/components/BeforeAfterShowcase";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import ScrollToTop from "@/components/ScrollToTop";
import PromoPopup from "@/components/PromoPopup";

type Lang = "de" | "en";

const T = {
  hero_free_badge: {
    de: "100% kostenlos · Kein Abo · Keine Kreditkarte",
    en: "100% free · No subscription · No credit card",
  },
  hero_badge:  { de: "KI-gestütztes Professionelles Mastering", en: "AI-Powered Professional Mastering" },
  hero_tagline: {
    de: [
      { text: "Upload",   color: "var(--accent-purple)" },
      { text: "Mastern",  color: "var(--accent-cyan)" },
      { text: "Download", color: "var(--accent-gold)" },
    ],
    en: [
      { text: "Upload",   color: "var(--accent-purple)" },
      { text: "Master",   color: "var(--accent-cyan)" },
      { text: "Download", color: "var(--accent-gold)" },
    ],
  },
  hero_desc: {
    de: "Professionelle Mastering-Pipeline powered by KI. Spotify-konformer Lautstärkepegel, Multiband-Kompression, M/S-Processing — in Sekunden. Und zwar komplett kostenlos.",
    en: "Professional-grade mastering chain powered by AI. Spotify-compliant loudness, multiband compression, M/S processing — in seconds. Completely free.",
  },
  lang_toggle: { de: "DE", en: "EN" },
};

const USPS = [
  {
    icon: Zap,
    title: { de: "Schnell", en: "Fast" },
    desc: { de: "Track hoch, in Sekunden fertig gemastert.", en: "Upload a track, get a finished master in seconds." },
  },
  {
    icon: Gift,
    title: { de: "Kostenlos", en: "Free" },
    desc: { de: "Keine Kosten, keine Kreditkarte, keine Haken.", en: "No cost, no credit card, no catch." },
  },
  {
    icon: ShieldCheck,
    title: { de: "Studio-Qualität", en: "Studio quality" },
    desc: { de: "Optimiert für Spotify, Apple Music & Co.", en: "Optimized for Spotify, Apple Music & more." },
  },
] as const;

export default function Home() {
  const [lang, setLang] = useState<Lang>("de");

  return (
    <div className="min-h-screen grid-bg">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/4 w-[800px] h-[400px] rounded-full"
            style={{
              background: "radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)",
              animation: "drift-slow 22s ease-in-out infinite",
            }}
          />
        </div>
        <div className="relative z-10 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-10 lg:gap-14 items-start">
          {/* Left — copy */}
          <motion.div
            className="text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Free badge — first thing visitors see */}
            <motion.div
              className="flex justify-center lg:justify-start mb-5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: "rgba(15,20,45,0.6)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 0 20px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <span
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 18, height: 18, background: "rgba(56,189,248,0.25)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span
                  className="text-xs sm:text-sm font-bold"
                  style={{ color: "var(--accent-cyan)", letterSpacing: "0.01em" }}
                >
                  {T.hero_free_badge[lang]}
                </span>
              </div>
            </motion.div>

            {/* Language Toggle */}
            <div className="flex justify-center lg:justify-start mb-4 gap-1">
              {(["de", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: "0.25rem 0.7rem",
                    borderRadius: "6px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid",
                    transition: "all 0.15s",
                    background: lang === l ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                    borderColor: lang === l ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)",
                    color: lang === l ? "var(--accent-purple)" : "var(--text-muted)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <motion.div
              className="label mb-4"
              style={{ color: "var(--accent-cyan)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {T.hero_badge[lang]}
            </motion.div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-2">
              <span style={{ color: "var(--accent-purple)" }}>Beat</span>
              <span style={{ color: "var(--accent-cyan)" }}>zucker</span>
            </h1>
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-4" style={{ color: "var(--text-muted)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
              {T.hero_tagline[lang].map((item, i, arr) => (
                <span key={i} className="flex items-center gap-2">
                  <span style={{ color: item.color }}>{item.text}</span>
                  {i < arr.length - 1 && <span style={{ opacity: 0.35 }}>·</span>}
                </span>
              ))}
            </div>
            <p className="text-lg max-w-md mx-auto lg:mx-0" style={{ color: "var(--text-secondary)" }}>
              {T.hero_desc[lang]}
            </p>

            {/* USP row */}
            <div className="grid grid-cols-3 gap-3 mt-8 max-w-md mx-auto lg:mx-0">
              {USPS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title.de}
                  className="glass-panel p-3 text-center lg:text-left"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  <Icon size={16} strokeWidth={2} color="var(--accent-purple)" className="mx-auto lg:mx-0 mb-1.5" />
                  <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{title[lang]}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>{desc[lang]}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — live mastering panel preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          >
            <MasteringWorkspace lang={lang} />
          </motion.div>
        </div>
      </section>

      <FeaturesSection lang={lang} />
      <BeforeAfterShowcase lang={lang} />
      <TestimonialsSection lang={lang} />
      <Footer />
      <ScrollToTop />
      <PromoPopup />
    </div>
  );
}
