"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import MasteringJsonLd from "@/components/MasteringJsonLd";
import MasterOverview, { type MasterOverviewData } from "@/components/MasterOverview";

type Lang = "de" | "en";

const COPY = {
  eyebrow: { de: "ADAPTIVES AUDIO-MASTERING", en: "ADAPTIVE AUDIO MASTERING" },
  title: {
    de: <>Online Mastering.<br />Kostenlos. Dein Sound.</>,
    en: <>Free online<br />mastering. Your sound.</>,
  },
  intro: {
    de: <>Mit <strong>Beatzucker</strong>: automatisch mastern, live feinabstimmen und deinen Master herunterladen.</>,
    en: <>With <strong>Beatzucker</strong>: master automatically, fine-tune live and download your finished master.</>,
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

export default function Home({ initialLang = "de" }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [masterOverview, setMasterOverview] = useState<MasterOverviewData | null>(null);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem("beatzucker-language", lang);
  }, [lang]);

  const changeLanguage = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    router.push(next === "en" ? "/en" : "/");
  };

  return (
    <div className="min-h-screen site-shell">
      <MasteringJsonLd lang={lang} />
      <Header lang={lang} />

      <main>
        <section className={`hero-section ${masterOverview ? "has-master-overview" : ""}`} aria-labelledby="hero-title">
          <div className="hero-aurora" aria-hidden="true" />
          <div className="hero-layout">
            <motion.div
              className="hero-copy"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            >
              <div className="language-switch" aria-label={lang === "de" ? "Sprache wählen" : "Choose language"}>
                {(["de", "en"] as Lang[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changeLanguage(item)}
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
              <p style={{color:"var(--text-secondary)",fontSize:12,lineHeight:1.7,margin:"12px 0 0"}}>{lang === "de" ? "Ohne Abo. Anmeldung erforderlich; es gilt dein tägliches Mastering-Kontingent." : "No subscription. Sign-in required; your daily mastering allowance applies."}</p>

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
              {masterOverview && <MasterOverview result={masterOverview} lang={lang} />}
            </motion.div>

            <motion.div
              id="mastering"
              className="hero-dashboard"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
            >
              <MasteringWorkspace lang={lang} onResultChange={setMasterOverview} />
            </motion.div>
          </div>
        </section>

        <FeaturesSection lang={lang} />
        <BeforeAfterShowcase lang={lang} />
        <TestimonialsSection lang={lang} />
      </main>

      <Footer lang={lang} />
      <ScrollToTop lang={lang} />
      <PromoPopup />
    </div>
  );
}
