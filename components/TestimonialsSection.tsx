"use client";

import { useState, useEffect } from "react";

type Lang = "de" | "en";
interface Props { lang?: Lang; }

const T = {
  label:   { de: "Nutzer", en: "Users" },
  heading: { de: "Was Nutzer sagen", en: "What users say" },
  sub: {
    de: "Tausende Tracks bereits gemastered — hier sind einige Stimmen aus unserer Community.",
    en: "Thousands of tracks mastered already — here are some voices from our community.",
  },
};

const TESTIMONIALS = [
  {
    name: "Marco R.",
    initials: "MR",
    color: "#7c6fff",
    role: { de: "Electronic Producer", en: "Electronic Producer" },
    text: {
      de: "Ich war skeptisch, ob KI wirklich professionelles Mastering liefern kann — aber das Ergebnis hat mich überzeugt. Meine Tracks klingen klarer, druckvoller und sind auf Spotify sofort auf Augenhöhe mit Major-Releases.",
      en: "I was skeptical about whether AI could really deliver professional mastering — but the result convinced me. My tracks sound clearer, punchier, and are instantly on par with major releases on Spotify.",
    },
  },
  {
    name: "Julia K.",
    initials: "JK",
    color: "#00e5c4",
    role: { de: "Singer-Songwriterin", en: "Singer-Songwriter" },
    text: {
      de: "Als Musikerin ohne technisches Background war ich immer auf teure Studios angewiesen. UpMaDo gibt mir die Kontrolle zurück — in Minuten, nicht Stunden, und zu einem Bruchteil der Kosten.",
      en: "As a musician without a technical background, I always relied on expensive studios. UpMaDo gives me back control — in minutes, not hours, and at a fraction of the cost.",
    },
  },
  {
    name: "Tobias N.",
    initials: "TN",
    color: "#f5c842",
    role: { de: "Hip-Hop Beatmaker", en: "Hip-Hop Beatmaker" },
    text: {
      de: "Der A/B-Vergleich direkt im Browser ist ein Game-Changer. Ich höre sofort den Unterschied und kann den Master genau dort einstellen, wo ich ihn haben will. Perfekt für mein Workflow.",
      en: "The A/B comparison directly in the browser is a game-changer. I immediately hear the difference and can dial in the master exactly where I want it. Perfect for my workflow.",
    },
  },
  {
    name: "Sarah M.",
    initials: "SM",
    color: "#a78bfa",
    role: { de: "Indie-Gitarristin", en: "Indie Guitarist" },
    text: {
      de: "Ich nutze UpMaDo für meine Demos vor dem Release. Die LUFS-Werte passen immer auf Anhieb — kein Pumpen, kein Clipping. Man merkt, dass wirklich professionelle Tools dahinterstecken.",
      en: "I use UpMaDo for my demos before release. The LUFS values are always spot on — no pumping, no clipping. You can tell that real professional tools are behind it.",
    },
  },
  {
    name: "Daniel W.",
    initials: "DW",
    color: "#34d399",
    role: { de: "Podcast-Produzent", en: "Podcast Producer" },
    text: {
      de: "Für Podcasts brauche ich konsistente Lautstärke über alle Folgen hinweg. Die Plattform-Presets (Spotify, Apple) treffen den Nagel auf den Kopf. Seit ich UpMaDo nutze, bekomme ich kaum noch Feedback-Beschwerden.",
      en: "For podcasts I need consistent volume across all episodes. The platform presets (Spotify, Apple) hit the nail on the head. Since using UpMaDo, I barely get any volume complaint feedback anymore.",
    },
  },
  {
    name: "Lena F.",
    initials: "LF",
    color: "#f472b6",
    role: { de: "DJ & Produzentin", en: "DJ & Producer" },
    text: {
      de: "Die Geschwindigkeit ist unglaublich — mein Track ist in unter zwei Minuten fertig gemastert. Für schnelle Releases zwischen Studio-Sessions ist UpMaDo unersetzlich geworden.",
      en: "The speed is incredible — my track is fully mastered in under two minutes. For quick releases between studio sessions, UpMaDo has become indispensable.",
    },
  },
];

export default function TestimonialsSection({ lang = "de" }: Props) {
  const [cols, setCols] = useState(3);

  useEffect(() => {
    function update() {
      if (window.innerWidth < 600) setCols(1);
      else if (window.innerWidth < 900) setCols(2);
      else setCols(3);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section style={{ padding: "5rem 1.5rem 4rem", position: "relative" }}>
      {/* subtle bg accent */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 40% at 50% 100%, rgba(124,111,255,0.05) 0%, transparent 70%)",
      }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(124,111,255,0.12)",
            border: "1px solid rgba(124,111,255,0.25)",
            borderRadius: "6px",
            padding: "0.25rem 0.85rem",
            fontSize: "0.72rem",
            color: "var(--accent-purple)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: "1rem",
          }}>
            {T.label[lang]}
          </div>
          <h2 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 0.75rem",
            lineHeight: 1.2,
          }}>
            {T.heading[lang]}
          </h2>
          <p style={{
            fontSize: "0.95rem",
            color: "var(--text-secondary)",
            maxWidth: "520px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            {T.sub[lang]}
          </p>
        </div>

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "1.25rem",
        }}>
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} lang={lang} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t, lang }: {
  t: typeof TESTIMONIALS[0];
  lang: Lang;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(124,111,255,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "16px",
        padding: "1.5rem",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "border-color 0.2s ease, transform 0.2s ease",
        cursor: "default",
      }}
    >
      {/* Stars */}
      <div style={{ fontSize: "0.9rem", letterSpacing: "0.1em", color: "var(--accent-gold)" }}>
        ★★★★★
      </div>

      {/* Quote */}
      <p style={{
        fontSize: "0.875rem",
        color: "var(--text-secondary)",
        lineHeight: 1.65,
        fontStyle: "italic",
        margin: 0,
        flexGrow: 1,
      }}>
        &ldquo;{t.text[lang]}&rdquo;
      </p>

      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: `${t.color}22`,
          border: `1.5px solid ${t.color}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", fontWeight: 800, color: t.color,
          flexShrink: 0, letterSpacing: "0.03em",
        }}>
          {t.initials}
        </div>
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
            {t.name}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {t.role[lang]}
          </div>
        </div>
      </div>
    </div>
  );
}
