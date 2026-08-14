"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

/* ─── Language strings ─────────────────────────────────────────────────────── */
const T = {
  de: {
    badge: "Features",
    hero_h1a: "Professionelles Mastering.",
    hero_h1b: "Vollautomatisch.",
    hero_sub: "UpMaDo kombiniert eine professionelle 13-stufige DSP-Pipeline mit KI-Parameterauswahl — für Ergebnisse auf Ozone/FabFilter-Niveau, in Sekunden.",
    stat1: "13 DSP-Stufen",
    stat2: "7 Formate",
    stat3: "11 Plattformen",
    stat4: "KI-gestützt",
    how_badge: "Wie es funktioniert",
    how_h2: "In 3 Schritten zum Master",
    step1_title: "Hochladen",
    step1_sub: "WAV, MP3, FLAC, AIFF — bis 500 MB",
    step2_title: "KI analysiert",
    step2_sub: "Vollständige Spektral-, LUFS- und Dynamik-Analyse",
    step3_title: "Herunterladen",
    step3_sub: "WAV, FLAC, MP3, AAC — sofort verfügbar",
    pipeline_badge: "DSP-Pipeline",
    pipeline_h2: "13-stufige Mastering-Chain",
    pipeline_sub: "Jede Stufe wurde für professionelles Mastering optimiert — von der DC-Entfernung bis zur finalen LUFS-Normalisierung.",
    platform_badge: "Plattformen",
    platform_h2: "Optimiert für jede Plattform",
    platform_sub: "Automatisches LUFS-Targeting für alle großen Streaming-Dienste.",
    format_badge: "Formate",
    format_h2: "Alle Formate in einem Durchgang",
    format_sub: "Ein Master — alle Formate gleichzeitig. Kein erneutes Hochladen.",
    features_badge: "Alle Features",
    features_h2: "Was UpMaDo kann",
    cta_h2: "Bereit für deinen ersten Master?",
    cta_sub: "Einfach hochladen — in 30 Sekunden fertig.",
    cta_btn: "Jetzt mastern →",
  },
  en: {
    badge: "Features",
    hero_h1a: "Professional Mastering.",
    hero_h1b: "Fully Automatic.",
    hero_sub: "UpMaDo combines a professional 13-stage DSP pipeline with AI parameter selection — delivering Ozone/FabFilter-level results in seconds.",
    stat1: "13 DSP Stages",
    stat2: "7 Formats",
    stat3: "11 Platforms",
    stat4: "AI-powered",
    how_badge: "How it works",
    how_h2: "3 Steps to your Master",
    step1_title: "Upload",
    step1_sub: "WAV, MP3, FLAC, AIFF — up to 500 MB",
    step2_title: "AI Analyzes",
    step2_sub: "Full spectral, LUFS and dynamics analysis",
    step3_title: "Download",
    step3_sub: "WAV, FLAC, MP3, AAC — instantly available",
    pipeline_badge: "DSP Pipeline",
    pipeline_h2: "13-Stage Mastering Chain",
    pipeline_sub: "Each stage is optimized for professional mastering — from DC removal to final LUFS normalization.",
    platform_badge: "Platforms",
    platform_h2: "Optimized for every Platform",
    platform_sub: "Automatic LUFS targeting for all major streaming services.",
    format_badge: "Formats",
    format_h2: "All Formats in one Pass",
    format_sub: "One master — all formats simultaneously. No re-uploading.",
    features_badge: "All Features",
    features_h2: "What UpMaDo can do",
    cta_h2: "Ready for your first Master?",
    cta_sub: "Just upload — done in 30 seconds.",
    cta_btn: "Start mastering →",
  },
};

/* ─── DSP Pipeline stages ──────────────────────────────────────────────────── */
const PIPELINE = [
  { num: 1,  label: "DC Remove",    group: "input",    icon: "⚡" },
  { num: 2,  label: "Correction EQ", group: "eq",      icon: "🎚" },
  { num: 3,  label: "Low Shelf",    group: "eq",       icon: "〰" },
  { num: 4,  label: "Mid Notch",    group: "eq",       icon: "🔧" },
  { num: 5,  label: "Air Shelf",    group: "eq",       icon: "✨" },
  { num: 6,  label: "De-Esser",     group: "comp",     icon: "🗣" },
  { num: 7,  label: "Multiband Comp", group: "comp",   icon: "🎛" },
  { num: 8,  label: "M/S Processing", group: "stereo", icon: "↔" },
  { num: 9,  label: "Saturation",   group: "color",    icon: "🔥" },
  { num: 10, label: "Final EQ",     group: "eq",       icon: "🎚" },
  { num: 11, label: "Bus Comp",     group: "comp",     icon: "🎯" },
  { num: 12, label: "True Peak Lim", group: "limit",   icon: "🛑" },
  { num: 13, label: "Dithering",    group: "output",   icon: "📊" },
];

const GROUP_COLORS: Record<string, string> = {
  input:  "rgba(100,116,139,0.6)",
  eq:     "rgba(124,111,255,0.7)",
  comp:   "rgba(0,229,196,0.7)",
  stereo: "rgba(245,200,66,0.7)",
  color:  "rgba(251,146,60,0.7)",
  limit:  "rgba(239,68,68,0.7)",
  output: "rgba(34,197,94,0.7)",
};

/* ─── Platform LUFS data ────────────────────────────────────────────────────── */
const PLATFORMS = [
  { icon: "🎵", name: "Spotify",       lufs: "−14 LUFS", peak: "−1 dBTP", color: "#1db954" },
  { icon: "🍎", name: "Apple Music",   lufs: "−16 LUFS", peak: "−1 dBTP", color: "#fc3c44" },
  { icon: "▶",  name: "YouTube",       lufs: "−14 LUFS", peak: "−1 dBTP", color: "#ff0000" },
  { icon: "🌊", name: "Tidal",         lufs: "−14 LUFS", peak: "−1 dBTP", color: "#00ffff" },
  { icon: "📦", name: "Amazon Music",  lufs: "−14 LUFS", peak: "−2 dBTP", color: "#ff9900" },
  { icon: "🎶", name: "Deezer",        lufs: "−15 LUFS", peak: "−1 dBTP", color: "#a238ff" },
  { icon: "📱", name: "TikTok",        lufs: "−13 LUFS", peak: "−1 dBTP", color: "#ff0050" },
  { icon: "☁",  name: "SoundCloud",    lufs:  "−0 LUFS", peak: "−1 dBTP", color: "#ff5500" },
  { icon: "🎧", name: "Club / DJ",     lufs:  "−9 LUFS", peak: "−1 dBTP", color: "var(--accent-cyan)" },
  { icon: "📺", name: "Broadcast/TV",  lufs: "−23 LUFS", peak: "−1 dBTP", color: "#64748b" },
  { icon: "⚙",  name: "Custom",        lufs: "Manuell",  peak: "Manuell", color: "var(--accent-purple)" },
];

/* ─── Format table ─────────────────────────────────────────────────────────── */
const FORMATS = [
  "WAV 32-bit Float", "WAV 24-bit", "WAV 16-bit", "FLAC 24-bit", "MP3 320 kbps", "MP3 128 kbps", "AAC 256 kbps",
];

/* ─── Feature cards ─────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    color: "var(--accent-purple)",
    title: { de: "KI-Parameterauswahl", en: "AI Parameter Selection" },
    desc: {
      de: "Die KI analysiert dein Audio und wählt automatisch optimale EQ-Korrekturen, Kompression, Stereobreite und Limiting — angepasst an Genre, Plattform und Dynamik.",
      en: "AI analyzes your audio and automatically selects optimal EQ corrections, compression, stereo width and limiting — adapted to genre, platform and dynamics.",
    },
    tags: ["Auto AI", "Genre-aware", "Plattform-optimiert", "Kostenlos"],
    visual: "ai",
  },
  {
    color: "var(--accent-cyan)",
    title: { de: "13-stufige DSP-Pipeline", en: "13-Stage DSP Pipeline" },
    desc: {
      de: "DC-Remove → Correction EQ → De-Esser → Multiband Comp → M/S → Saturation → Bus Comp → True Peak Limiter → Noise-Shaped Dithering. Professioneller Workflow in Sekunden.",
      en: "DC Remove → Correction EQ → De-Esser → Multiband Comp → M/S → Saturation → Bus Comp → True Peak Limiter → Noise-Shaped Dithering. Professional workflow in seconds.",
    },
    tags: ["EQ", "Multiband", "M/S", "Limiting"],
    visual: "pipeline",
  },
  {
    color: "#f59e0b",
    title: { de: "Mastering Intensity", en: "Mastering Intensity" },
    desc: {
      de: "Von 0% (transparent) bis 100% (maximales Processing). Alle DSP-Parameter skalieren intelligent mit — kein Pumpen, kein Übersteuern.",
      en: "From 0% (transparent) to 100% (maximum processing). All DSP parameters scale intelligently — no pumping, no clipping.",
    },
    tags: ["0–100%", "Transparent", "Maximum"],
    visual: "slider",
  },
  {
    color: "var(--accent-purple)",
    title: { de: "Plattform-Loudness", en: "Platform Loudness" },
    desc: {
      de: "Spotify (–14 LUFS), Apple Music (–16 LUFS), YouTube (–14 LUFS), Club (–9 LUFS) und Custom-Target. True Peak Ceiling −1 dBTP für alle.",
      en: "Spotify (−14 LUFS), Apple Music (−16 LUFS), YouTube (−14 LUFS), Club (−9 LUFS) and custom target. True Peak Ceiling −1 dBTP for all.",
    },
    tags: ["Spotify", "Apple Music", "YouTube", "Club"],
    visual: "platforms",
  },
  {
    color: "var(--accent-cyan)",
    title: { de: "A/B-Vergleich Player", en: "A/B Comparison Player" },
    desc: {
      de: "Vergleiche Original (A) und Master (B) in Echtzeit. Nahtloses Umschalten ohne Unterbrechung. Live-Visualisierungen synchron zur Musik.",
      en: "Compare original (A) and master (B) in real time. Seamless switching without interruption. Live visualizations synced to the music.",
    },
    tags: ["Echtzeit", "Sync-Visualizer", "Live"],
    visual: "ab",
  },
  {
    color: "#f59e0b",
    title: { de: "Erweiterte Analyse", en: "Advanced Analysis" },
    desc: {
      de: "LUFS, True Peak, Dynamic Range, Crest Factor, BPM, Key, Spectral Centroid, Stereo Width, Mono Compatibility und Frequency Band Energy.",
      en: "LUFS, True Peak, Dynamic Range, Crest Factor, BPM, Key, Spectral Centroid, Stereo Width, Mono Compatibility and Frequency Band Energy.",
    },
    tags: ["LUFS", "DR", "BPM", "Key"],
    visual: "analysis",
  },
  {
    color: "var(--accent-purple)",
    title: { de: "Referenz-Track", en: "Reference Track" },
    desc: {
      de: "Lade einen Referenz-Track hoch — die KI matched Loudness, Spektralbalance, Dynamik und Stereobreite automatisch.",
      en: "Upload a reference track — AI automatically matches loudness, spectral balance, dynamics and stereo width.",
    },
    tags: ["AI Matching", "Reference", "Spectral", "Kostenlos"],
    visual: "reference",
  },
  {
    color: "var(--accent-cyan)",
    title: { de: "Spectrogram Waterfall", en: "Spectrogram Waterfall" },
    desc: {
      de: "Animierter Wasserfall zeigt das Frequenzspektrum über die Zeit — von Sub-Bass bis Air — in Echtzeit.",
      en: "Animated waterfall shows the frequency spectrum over time — from sub bass to air — in real time.",
    },
    tags: ["Echtzeit", "Frequenz", "Zeit"],
    visual: "waterfall",
  },
  {
    color: "#f59e0b",
    title: { de: "Mastering Analyse", en: "Mastering Analysis" },
    desc: {
      de: "Detaillierter Pre/Post-Vergleich mit LUFS-Werten, KI-Parametern, Loudness-Tabelle, Dynamic Range und allen verwendeten Mastering-Einstellungen — direkt im Browser.",
      en: "Detailed pre/post comparison with LUFS values, AI parameters, loudness table, dynamic range and all mastering settings used — directly in the browser.",
    },
    tags: ["Pre/Post", "LUFS", "Parameter"],
    visual: "report",
  },
  {
    color: "var(--accent-purple)",
    title: { de: "Alle Formate", en: "All Formats" },
    desc: {
      de: "WAV 32-bit Float, WAV 24/16-bit (TPDF-Dither), FLAC 24-bit, MP3 320/128 kbps und AAC 256 kbps — alle in einem Durchgang.",
      en: "WAV 32-bit Float, WAV 24/16-bit (TPDF dither), FLAC 24-bit, MP3 320/128 kbps and AAC 256 kbps — all in one pass.",
    },
    tags: ["WAV", "FLAC", "MP3", "AAC"],
    visual: "formats",
  },
  {
    color: "var(--accent-cyan)",
    title: { de: "Mobile-first", en: "Mobile-first" },
    desc: {
      de: "Vollständig responsive Oberfläche — funktioniert auf Desktop, Tablet und Smartphone.",
      en: "Fully responsive interface — works on desktop, tablet and smartphone.",
    },
    tags: ["Responsive", "Mobile", "Tablet"],
    visual: "mobile",
  },
  {
    color: "#f59e0b",
    title: { de: "Keyboard Shortcuts", en: "Keyboard Shortcuts" },
    desc: {
      de: "M = Mastering starten, Leertaste = Play/Pause, A = Original, B = Master.",
      en: "M = start mastering, Space = play/pause, A = original, B = master.",
    },
    tags: ["M", "Space", "A/B"],
    visual: "keyboard",
  },
  {
    color: "#22c55e",
    title: { de: "Privacy by Design", en: "Privacy by Design" },
    desc: {
      de: "Kein Tracking, keine Werbe-Cookies, kein Analytics. Audiodateien werden nicht dauerhaft gespeichert. Alle Fonts werden lokal ausgeliefert — kein externer Request, kein IP-Leak.",
      en: "No tracking, no ad cookies, no analytics. Audio files are never permanently stored. All fonts are served locally — no external request, no IP leak.",
    },
    tags: ["No Tracking", "No Cookies", "DSGVO-konform", "EU-Server"],
    visual: "privacy",
  },
];

/* ─── Mini visual components ────────────────────────────────────────────────── */

function VisualAI() {
  return (
    <div className="relative h-16 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--accent-purple)",
              left: `${20 + i * 12}%`,
              top: `${30 + Math.sin(i * 1.2) * 25}%`,
              opacity: 0.6 + (i % 3) * 0.15,
              boxShadow: "0 0 4px var(--accent-purple)",
            }} />
        ))}
      </div>
      <div className="text-3xl">🤖</div>
      <div className="absolute bottom-0 right-4 text-[9px] mono" style={{ color: "var(--accent-purple)" }}>
        AI params ✓
      </div>
    </div>
  );
}

function VisualPipeline() {
  const stages = ["EQ", "COMP", "M/S", "LIM"];
  return (
    <div className="flex items-center gap-1 justify-center h-16">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className="px-1.5 py-1 rounded text-[9px] font-bold"
            style={{ background: "rgba(0,229,196,0.15)", border: "1px solid rgba(0,229,196,0.3)", color: "var(--accent-cyan)" }}>
            {s}
          </div>
          {i < stages.length - 1 && <span style={{ color: "var(--accent-cyan)", fontSize: 10 }}>→</span>}
        </div>
      ))}
    </div>
  );
}

function VisualSlider() {
  return (
    <div className="h-16 flex flex-col items-center justify-center gap-2">
      <div className="text-[9px] mono flex justify-between w-full px-2" style={{ color: "var(--text-muted)" }}>
        <span>0%</span><span style={{ color: "#f59e0b" }}>65% Balanced</span><span>100%</span>
      </div>
      <div className="w-full px-2 relative">
        <div className="h-1.5 rounded-full w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-1.5 rounded-full absolute top-0 left-2" style={{ width: "65%", background: "linear-gradient(90deg, var(--accent-purple), #f59e0b)" }} />
        <div className="w-3 h-3 rounded-full absolute -top-[3px]" style={{ left: "calc(65% - 4px)", background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }} />
      </div>
    </div>
  );
}

function VisualPlatforms() {
  const p = [{ icon: "🎵", v: "−14" }, { icon: "▶", v: "−14" }, { icon: "🎧", v: "−9" }];
  return (
    <div className="h-16 flex items-center justify-center gap-3">
      {p.map((pl) => (
        <div key={pl.icon} className="flex flex-col items-center gap-1">
          <span className="text-xl">{pl.icon}</span>
          <span className="text-[9px] mono font-bold" style={{ color: "var(--accent-purple)" }}>{pl.v}</span>
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>LUFS</span>
        </div>
      ))}
    </div>
  );
}

function VisualAB() {
  return (
    <div className="h-16 flex items-center gap-3 justify-center">
      {["A", "B"].map((label, i) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <div className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{
              background: i === 0 ? "rgba(124,111,255,0.2)" : "rgba(0,229,196,0.2)",
              border: `1px solid ${i === 0 ? "rgba(124,111,255,0.4)" : "rgba(0,229,196,0.4)"}`,
              color: i === 0 ? "var(--accent-purple)" : "var(--accent-cyan)",
            }}>
            {label}
          </div>
          <div className="flex gap-0.5 items-end h-5">
            {[3,5,4,6,3,5,4,3].map((h, j) => (
              <div key={j} style={{ width: 2, height: h * (i === 0 ? 1 : 1.3), background: i === 0 ? "var(--accent-purple)" : "var(--accent-cyan)", borderRadius: 1, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VisualAnalysis() {
  const metrics = [{ l: "LUFS", v: "−14.0" }, { l: "DR", v: "11" }, { l: "BPM", v: "128" }];
  return (
    <div className="h-16 flex items-center justify-center gap-4">
      {metrics.map((m) => (
        <div key={m.l} className="text-center">
          <div className="text-xs mono font-bold" style={{ color: "var(--accent-cyan)" }}>{m.v}</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{m.l}</div>
        </div>
      ))}
    </div>
  );
}

function VisualReference() {
  return (
    <div className="h-16 flex items-center gap-2 justify-center">
      <div className="flex flex-col items-center gap-1">
        <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>REF</div>
        <div className="flex gap-0.5 items-end h-6">
          {[2,4,5,3,6,4,3,5].map((h, j) => (
            <div key={j} style={{ width: 2, height: h, background: "#f59e0b", borderRadius: 1, opacity: 0.7 }} />
          ))}
        </div>
      </div>
      <div className="text-xs" style={{ color: "var(--accent-purple)" }}>→ AI →</div>
      <div className="flex flex-col items-center gap-1">
        <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>OUT</div>
        <div className="flex gap-0.5 items-end h-6">
          {[2,4,5,3,6,4,3,5].map((h, j) => (
            <div key={j} style={{ width: 2, height: h, background: "var(--accent-cyan)", borderRadius: 1, opacity: 0.8 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VisualWaterfall() {
  const cols = 12;
  const rows = 5;
  return (
    <div className="h-16 flex items-end justify-center gap-px pt-2">
      {Array.from({ length: cols }, (_, c) =>
        <div key={c} className="flex flex-col gap-px">
          {Array.from({ length: rows }, (_, r) => {
            const intensity = Math.max(0, 1 - (r * 0.2 + c * 0.05 + Math.sin(c * 0.8 + r) * 0.3));
            return (
              <div key={r} style={{
                width: 8, height: 6,
                background: `rgba(0,229,196,${intensity * 0.8})`,
                borderRadius: 1,
              }} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function VisualReport() {
  return (
    <div className="h-16 flex items-center justify-center gap-3">
      <div className="rounded-lg p-2 flex flex-col gap-1.5" style={{ background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.2)" }}>
        {["LUFS: −14.0", "Peak: −1.0 dBTP", "DR: 11"].map((line) => (
          <div key={line} className="text-[8px] mono" style={{ color: "var(--accent-gold)" }}>{line}</div>
        ))}
      </div>
      <div className="text-2xl">📄</div>
    </div>
  );
}

function VisualFormats() {
  const fmts = ["WAV", "FLAC", "MP3", "AAC"];
  return (
    <div className="h-16 flex flex-wrap items-center justify-center gap-1.5 content-center">
      {fmts.map((f, i) => {
        const colors = ["var(--accent-purple)", "var(--accent-cyan)", "#f59e0b", "#06b6d4"];
        return (
          <span key={f} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: `rgba(255,255,255,0.06)`, border: `1px solid ${colors[i]}44`, color: colors[i] }}>
            {f}
          </span>
        );
      })}
    </div>
  );
}

function VisualMobile() {
  return (
    <div className="h-16 flex items-center justify-center gap-3">
      {["💻", "📱"].map((icon) => (
        <div key={icon} className="text-2xl" style={{ opacity: 0.85 }}>{icon}</div>
      ))}
    </div>
  );
}

function VisualKeyboard() {
  const keys = [{ k: "M", desc: "Master" }, { k: "⎵", desc: "Play" }, { k: "A/B", desc: "A/B" }];
  return (
    <div className="h-16 flex items-center justify-center gap-2">
      {keys.map(({ k, desc }) => (
        <div key={k} className="flex flex-col items-center gap-1">
          <kbd className="px-2 py-1 rounded text-xs font-bold"
            style={{
              background: "rgba(245,200,66,0.1)",
              border: "1px solid rgba(245,200,66,0.4)",
              color: "#f59e0b",
              boxShadow: "0 2px 0 rgba(245,200,66,0.3)",
              fontFamily: "monospace",
            }}>
            {k}
          </kbd>
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>{desc}</span>
        </div>
      ))}
    </div>
  );
}

function VisualPrivacy() {
  const badges = ["🚫 Tracking", "🍪 Cookies", "📊 Analytics"];
  return (
    <div className="h-16 flex flex-col items-center justify-center gap-2">
      <div className="flex gap-2">
        {badges.map((b) => (
          <span key={b} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
              textDecoration: "line-through",
            }}>
            {b}
          </span>
        ))}
      </div>
      <span className="text-[9px] font-bold" style={{ color: "#22c55e", letterSpacing: "0.05em" }}>
        ✓ EU-Server · DSGVO · Privacy by Design
      </span>
    </div>
  );
}

const VISUALS: Record<string, () => React.ReactElement> = {
  ai: VisualAI,
  pipeline: VisualPipeline,
  slider: VisualSlider,
  platforms: VisualPlatforms,
  ab: VisualAB,
  analysis: VisualAnalysis,
  reference: VisualReference,
  waterfall: VisualWaterfall,
  report: VisualReport,
  formats: VisualFormats,
  mobile: VisualMobile,
  keyboard: VisualKeyboard,
  privacy: VisualPrivacy,
};

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function FeaturesPage() {
  const [lang, setLang] = useState<"de" | "en">("de");
  const t = T[lang];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <Header />

      {/* Language toggle */}
      <div className="fixed top-16 right-4 z-40 flex gap-1 rounded-lg p-1"
        style={{ background: "rgba(14,17,23,0.85)", border: "1px solid var(--border-subtle)", backdropFilter: "blur(8px)" }}>
        {(["de", "en"] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)}
            className="px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all"
            style={lang === l
              ? { background: "var(--accent-purple)", color: "#fff" }
              : { color: "var(--text-muted)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "7rem 2rem 3rem" }}>
        <div style={{
          display: "inline-block", background: "rgba(124,111,255,0.1)",
          border: "1px solid rgba(124,111,255,0.25)", borderRadius: "6px",
          padding: "0.25rem 0.75rem", fontSize: "0.75rem",
          color: "var(--accent-purple)", letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: "1.5rem",
        }}>
          {t.badge}
        </div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 800, marginBottom: "1rem" }}>
          {t.hero_h1a}{" "}
          <span style={{ color: "var(--accent-cyan)" }}>{t.hero_h1b}</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 2rem", lineHeight: 1.7 }}>
          {t.hero_sub}
        </p>
        {/* Stat pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
          {[t.stat1, t.stat2, t.stat3, t.stat4].map((s) => (
            <div key={s} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "100px", padding: "0.35rem 1rem", fontSize: "0.8rem",
              color: "var(--text-secondary)", fontWeight: 600,
            }}>
              {s}
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            display: "inline-block", background: "rgba(0,229,196,0.1)",
            border: "1px solid rgba(0,229,196,0.25)", borderRadius: "6px",
            padding: "0.25rem 0.75rem", fontSize: "0.75rem",
            color: "var(--accent-cyan)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "1rem",
          }}>
            {t.how_badge}
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{t.how_h2}</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
          {[
            {
              num: 1, title: t.step1_title, sub: t.step1_sub,
              color: "var(--accent-purple)",
              visual: (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 80, height: 60, border: "2px dashed rgba(124,111,255,0.5)",
                    borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(124,111,255,0.05)",
                  }}>
                    <span style={{ fontSize: 24 }}>🎵</span>
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center" }}>
                    WAV · MP3 · FLAC · AIFF
                  </div>
                </div>
              ),
            },
            {
              num: 2, title: t.step2_title, sub: t.step2_sub,
              color: "var(--accent-cyan)",
              visual: (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 24 }}>🤖</div>
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
                    {[4,7,5,9,6,8,5,7,4,6].map((h, i) => (
                      <div key={i} style={{
                        width: 5, height: h * 3, background: "var(--accent-cyan)",
                        borderRadius: 2, opacity: 0.6 + (i % 3) * 0.13,
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>LUFS · BPM · Key · DR</div>
                </div>
              ),
            },
            {
              num: 3, title: t.step3_title, sub: t.step3_sub,
              color: "#f59e0b",
              visual: (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                  {["WAV 24", "FLAC", "MP3 320", "AAC"].map((f) => (
                    <div key={f} style={{
                      padding: "3px 8px", borderRadius: 4, fontSize: "0.65rem", fontWeight: 700,
                      background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                      color: "#f59e0b",
                    }}>
                      {f}
                    </div>
                  ))}
                </div>
              ),
            },
          ].map((step, i, arr) => (
            <div key={step.num} style={{ position: "relative" }}>
              <div className="glass-panel p-5" style={{ border: `1px solid ${step.color}22`, textAlign: "center" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 0.75rem",
                  background: `${step.color}22`, border: `1px solid ${step.color}55`,
                  fontSize: "0.875rem", fontWeight: 800, color: step.color,
                }}>
                  {step.num}
                </div>
                <div style={{ marginBottom: "0.75rem" }}>{step.visual}</div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{step.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{step.sub}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{
                  position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-muted)", fontSize: "1.25rem", zIndex: 10,
                  display: "none",  // shown via CSS on md+
                }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── DSP Pipeline ── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-block", background: "rgba(245,200,66,0.1)",
            border: "1px solid rgba(245,200,66,0.25)", borderRadius: "6px",
            padding: "0.25rem 0.75rem", fontSize: "0.75rem",
            color: "var(--accent-gold)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "1rem",
          }}>
            {t.pipeline_badge}
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>{t.pipeline_h2}</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", fontSize: "0.875rem" }}>
            {t.pipeline_sub}
          </p>
        </div>

        <div className="glass-panel p-5" style={{ overflowX: "auto" }}>
          {/* Render in 2 rows (7 + 6) */}
          {[PIPELINE.slice(0, 7), PIPELINE.slice(7, 13)].map((row, ri) => (
            <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: ri === 0 ? 8 : 0, flexWrap: "nowrap", minWidth: "max-content" }}>
              {row.map((stage, si) => (
                <div key={stage.num} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "0.5rem 0.75rem", borderRadius: 8, minWidth: 80,
                    background: `${GROUP_COLORS[stage.group]}15`,
                    border: `1px solid ${GROUP_COLORS[stage.group]}`,
                  }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      {String(stage.num).padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: "1rem" }}>{stage.icon}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textAlign: "center", fontWeight: 600 }}>
                      {stage.label}
                    </div>
                  </div>
                  {si < row.length - 1 && (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", flexShrink: 0 }}>→</span>
                  )}
                </div>
              ))}
              {ri === 0 && (
                <div style={{ marginLeft: 4 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>↓</span>
                </div>
              )}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {Object.entries({ input: "Input", eq: "EQ", comp: "Dynamics", stereo: "Stereo", color: "Saturation", limit: "Limiting", output: "Output" }).map(([k, label]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: GROUP_COLORS[k] }} />
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-block", background: "rgba(124,111,255,0.1)",
            border: "1px solid rgba(124,111,255,0.25)", borderRadius: "6px",
            padding: "0.25rem 0.75rem", fontSize: "0.75rem",
            color: "var(--accent-purple)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "1rem",
          }}>
            {t.features_badge}
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{t.features_h2}</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {FEATURES.map((f) => {
            const Visual = VISUALS[f.visual];
            return (
              <div key={f.visual} className="glass-panel p-4"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${f.color}44`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${f.color}11`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {/* Mini visual */}
                <div className="rounded-lg mb-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "0.5rem" }}>
                  <Visual />
                </div>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem", color: f.color }}>
                  {f.title[lang]}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                  {f.desc[lang]}
                </p>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {f.tags.map((tag) => (
                    <span key={tag} style={{
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "4px", padding: "0.1rem 0.45rem",
                      fontSize: "0.65rem", color: "var(--text-muted)",
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Platform Table ── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-block", background: "rgba(0,229,196,0.1)",
            border: "1px solid rgba(0,229,196,0.25)", borderRadius: "6px",
            padding: "0.25rem 0.75rem", fontSize: "0.75rem",
            color: "var(--accent-cyan)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "1rem",
          }}>
            {t.platform_badge}
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>{t.platform_h2}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t.platform_sub}</p>
        </div>

        <div className="glass-panel" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Plattform", "Loudness Target", "True Peak"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((p, i) => (
                  <tr key={p.name} style={{ borderBottom: i < PLATFORMS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td style={{ padding: "0.65rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.1rem" }}>{p.icon}</span>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.65rem 1rem" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: p.color, fontSize: "0.875rem" }}>
                        {p.lufs}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 1rem", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {p.peak}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Format Table ── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-block", background: "rgba(245,200,66,0.1)",
            border: "1px solid rgba(245,200,66,0.25)", borderRadius: "6px",
            padding: "0.25rem 0.75rem", fontSize: "0.75rem",
            color: "var(--accent-gold)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "1rem",
          }}>
            {t.format_badge}
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>{t.format_h2}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t.format_sub}</p>
        </div>

        <div className="glass-panel" style={{ overflow: "hidden", padding: "1.5rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center" }}>
            {FORMATS.map((fmt) => (
              <span
                key={fmt}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1rem", borderRadius: "8px",
                  background: "rgba(0,229,196,0.08)", border: "1px solid rgba(0,229,196,0.2)",
                  fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)",
                }}
              >
                <span style={{ color: "var(--accent-cyan)" }}>✓</span>
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign: "center", padding: "3rem 2rem 5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "1rem" }}>{t.cta_h2}</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{t.cta_sub}</p>
        <Link href="/" style={{
          background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
          color: "#fff", padding: "0.875rem 2.5rem", borderRadius: "10px",
          textDecoration: "none", fontSize: "1rem", fontWeight: 700, display: "inline-block",
        }}>
          {t.cta_btn}
        </Link>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
