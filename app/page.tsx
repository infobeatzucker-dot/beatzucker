"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Gift, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Header from "@/components/Header";
import MasteringWorkspace from "@/components/MasteringWorkspace";
import FeaturesSection from "@/components/FeaturesSection";
import BeforeAfterShowcase from "@/components/BeforeAfterShowcase";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import ScrollToTop from "@/components/ScrollToTop";
import PromoPopup from "@/components/PromoPopup";

type Lang = "de" | "en";

const COPY = {
  eyebrow: { de: "ADAPTIVES AUDIO-MASTERING", en: "ADAPTIVE AUDIO MASTERING" },
  title: {
    de: <>Professionelles<br />Mastering für alle.</>,
    en: <>Professional<br />mastering for everyone.</>,
  },
  intro: {
    de: <>Mit <strong>Beatzucker</strong>: Schnell, kostenlos, Studio-Qualität.</>,
    en: <>With <strong>Beatzucker</strong>: Fast, free, studio quality.</>,
  },
  cta: { de: "Jetzt mastern", en: "Master now" },
};

const USPS = [
  {
    icon: Zap,
    title: { de: "Schnell", en: "Fast" },
    desc: { de: "In wenigen Minuten zum fertigen Sound.", en: "A finished sound in just minutes." },
  },
  {
    icon: Gift,
    title: { de: "Kostenlos", en: "Free" },
    desc: { de: "Professionelles Mastering ohne Kosten.", en: "Professional mastering at no cost." },
  },
  {
    icon: ShieldCheck,
    title: { de: "Studio-Qualität", en: "Studio quality" },
    desc: { de: "Optimiert für moderne Plattformen.", en: "Optimized for modern platforms." },
  },
] as const;

export default function Home() {
  const [lang, setLang] = useState<Lang>("de");

  useEffect(() => {
    const saved = window.localStorage.getItem("beatzucker-language");
    if (saved === "de" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem("beatzucker-language", lang);
  }, [lang]);

  return (
    <div className="min-h-screen site-shell">
      <Header lang={lang} />

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-aurora" aria-hidden="true" />
          <div className="hero-layout">
            <motion.div
              className="hero-copy"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            >
              <div className="language-switch" aria-label={lang === "de" ? "Sprache wählen" : "Choose language"}>
                {(["de", "en"] as Lang[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLang(item)}
                    className={lang === item ? "active" : ""}
                    aria-pressed={lang === item}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="hero-eyebrow">
                <Sparkles size={15} aria-hidden="true" />
                {COPY.eyebrow[lang]}
              </div>
              <h1 id="hero-title">{COPY.title[lang]}</h1>
              <p className="hero-intro">{COPY.intro[lang]}</p>

              <a className="neon-cta hero-cta" href="#mastering">
                {COPY.cta[lang]}
                <ArrowRight size={20} aria-hidden="true" />
              </a>

              <div className="hero-usps">
                {USPS.map(({ icon: Icon, title, desc }) => (
                  <div className="hero-usp" key={title.de}>
                    <span className="usp-icon"><Icon size={20} aria-hidden="true" /></span>
                    <span>
                      <strong>{title[lang]}</strong>
                      <small>{desc[lang]}</small>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              id="mastering"
              className="hero-dashboard"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
            >
              <MasteringWorkspace lang={lang} />
            </motion.div>
          </div>
        </section>

        <FeaturesSection lang={lang} />
        <BeforeAfterShowcase lang={lang} />
        <TestimonialsSection lang={lang} />
      </main>

      <Footer lang={lang} />
      <ScrollToTop />
      <PromoPopup />
    </div>
  );
}
