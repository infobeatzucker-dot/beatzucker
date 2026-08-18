"use client";

import { useState, useEffect } from "react";

type Lang = "de" | "en";
interface Props { lang?: Lang; }

const T = {
  label:   { de: "Community", en: "Community" },
  heading: { de: "Direkt aus der Community", en: "Straight from the community" },
  sub: {
    de: "Ein paar Rückmeldungen von Leuten, die ihre Tracks schon über Beatzucker gejagt haben.",
    en: "A few notes from people who've already run their tracks through Beatzucker.",
  },
};

const TESTIMONIALS = [
  {
    name: "Jonas B.",
    initials: "JB",
    color: "#8b5cf6",
    role: { de: "Electronic Producer", en: "Electronic Producer" },
    text: {
      de: "Hab's erst nicht geglaubt, dass eine Automatik da rankommt an einen echten Mastering-Job. Nach dem ersten Export war ich still — der Track hatte plötzlich das Punch-Level, das sonst nur teure Releases haben.",
      en: "Honestly didn't expect an automated tool to get anywhere close to a real mastering job. First export changed my mind fast — suddenly my track had that punch you usually only hear on big-budget releases.",
    },
  },
  {
    name: "Nina S.",
    initials: "NS",
    color: "#38bdf8",
    role: { de: "Singer-Songwriterin", en: "Singer-Songwriter" },
    text: {
      de: "Ich komme aus der Songwriting-Ecke, nicht aus der Technik — Studios waren für mich immer eine Kostenfrage. Jetzt lade ich hoch, warte ein paar Sekunden und habe einen Master, den ich mir sonst nicht hätte leisten können.",
      en: "I'm a songwriter, not an engineer — studio time was always a budget problem for me. Now I upload, wait a few seconds, and get a master I couldn't have afforded otherwise.",
    },
  },
  {
    name: "Kevin M.",
    initials: "KM",
    color: "#c4b5fd",
    role: { de: "Hip-Hop Beatmaker", en: "Hip-Hop Beatmaker" },
    text: {
      de: "Was mich überzeugt hat, ist der direkte A/B-Vergleich im Player — kein Rätselraten, ob sich was verändert hat. Ich höre live, wo der Unterschied sitzt, und feile so lange, bis der Master genau meins ist.",
      en: "What sold me was the built-in A/B player — no guessing whether anything actually changed. I can hear exactly where the difference sits and dial it in until the master feels like mine.",
    },
  },
  {
    name: "Laura T.",
    initials: "LT",
    color: "#a78bfa",
    role: { de: "Indie-Gitarristin", en: "Indie Guitarist" },
    text: {
      de: "Meine Demos gehen alle vorher durch Beatzucker. Die Lautheit trifft jedes Mal, ohne dass irgendwas anfängt zu pumpen oder zu clippen — merkt man einfach, dass da solide DSP-Arbeit dahintersteckt.",
      en: "Every demo of mine goes through Beatzucker first. The loudness lands right every single time, nothing starts pumping or clipping — you can tell there's solid DSP work behind it.",
    },
  },
  {
    name: "Fabian K.",
    initials: "FK",
    color: "#34d399",
    role: { de: "Podcast-Produzent", en: "Podcast Producer" },
    text: {
      de: "Bei einem Podcast zählt vor allem eins: gleichbleibende Lautstärke über alle Folgen. Die Plattform-Presets für Spotify und Apple sitzen sofort — die Beschwerden über zu leise oder zu laute Folgen sind quasi verschwunden.",
      en: "For a podcast, one thing matters most: consistent volume across every episode. The Spotify and Apple presets nail it immediately — complaints about episodes being too quiet or too loud have basically disappeared.",
    },
  },
  {
    name: "Melina P.",
    initials: "MP",
    color: "#f472b6",
    role: { de: "DJ & Produzentin", en: "DJ & Producer" },
    text: {
      de: "Zwischen zwei Studio-Sessions bleibt selten Zeit für Mastering — mit Beatzucker ist der Track fertig, bevor der Kaffee kalt wird. Für schnelle Releases hat sich das für mich zum festen Werkzeug entwickelt.",
      en: "There's rarely time for mastering between studio sessions — with Beatzucker the track's done before my coffee goes cold. It's become a permanent part of my toolkit for fast releases.",
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
        background: "radial-gradient(ellipse 80% 40% at 50% 100%, rgba(139,92,246,0.05) 0%, transparent 70%)",
      }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.25)",
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
        border: `1px solid ${hovered ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}`,
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
