"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import { Music, Disc, Play } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
type Lang = "de" | "en";
interface Bilingual { de: string; en: string; }
const t = (o: Bilingual, lang: Lang) => o[lang];

/* ─── Bilingual Strings ──────────────────────────────────── */
const T = {
  hero_badge:   { de: "Support-Center", en: "Support Center" },
  hero_h1:      { de: "Womit können wir dir weiterhelfen?", en: "What do you need a hand with?" },
  hero_sub:     { de: "Alles, was du über Beatzucker wissen musst, kompakt an einem Ort.", en: "Everything you need to know about Beatzucker, gathered in one place." },
  hero_contact: { de: "Deine Frage steht nicht dabei? Schreib uns direkt:", en: "Can't find it here? Reach out directly:" },
  search_ph:    { de: "Suche in den FAQ…", en: "Search the FAQ…" },
  qs_title:     { de: "Loslegen", en: "Get Started" },
  qs_sub:       { de: "Dein Master in vier Schritten", en: "Your master, four steps away" },
  qs_steps: {
    de: [
      { n: "01", title: "Datei hochladen", desc: "WAV, MP3, FLAC oder AIFF reinziehen oder per Klick auswählen." },
      { n: "02", title: "Ziel festlegen", desc: "Zielplattform wie Spotify, Apple Music oder Club wählen, dazu passenden Stil." },
      { n: "03", title: "Auf \"M\" tippen", desc: "Mastern klicken oder einfach M drücken — die KI übernimmt den Rest." },
      { n: "04", title: "Download", desc: "Als WAV 32-bit, FLAC 24-bit, MP3 320 und weiteren Formaten sofort holen." },
    ],
    en: [
      { n: "01", title: "Upload your file", desc: "Drop in WAV, MP3, FLAC or AIFF — or just click to browse." },
      { n: "02", title: "Set your target", desc: "Pick where it's headed — Spotify, Apple Music, club — plus the matching genre." },
      { n: "03", title: "Hit \"M\"", desc: "Click Master or press M — the AI takes it from there." },
      { n: "04", title: "Download", desc: "Grab it instantly as WAV 32-bit, FLAC 24-bit, MP3 320 and more." },
    ],
  },
  kbd_title: { de: "Shortcuts", en: "Shortcuts" },
  kbd_sub:   { de: "Ohne Maus durch den Workflow", en: "Move through the workflow without the mouse" },
  kbd_keys: {
    de: [
      { key: "M",      desc: "Startet das Mastering" },
      { key: "Space",  desc: "Wiedergabe starten/stoppen" },
      { key: "A",      desc: "Original anhören" },
      { key: "B",      desc: "Gemasterten Track anhören" },
    ],
    en: [
      { key: "M",      desc: "Kicks off mastering" },
      { key: "Space",  desc: "Toggle playback" },
      { key: "A",      desc: "Listen to the original" },
      { key: "B",      desc: "Listen to the master" },
    ],
  },
  viz_title: { de: "Visualizer", en: "Visualizers" },
  viz_sub:   { de: "Was dir die einzelnen Analysen verraten", en: "What each analysis actually tells you" },
  faq_title:   { de: "Fragen, die uns oft erreichen", en: "Questions we hear a lot" },
  faq_no_res:  { de: "Dazu haben wir nichts gefunden.", en: "Nothing matched your search." },
  cta_h3:      { de: "Frage nicht beantwortet?", en: "Didn't find your answer?" },
  cta_sub:     { de: "Unser Team meldet sich innerhalb eines Tages zurück.", en: "Our team gets back to you within a day." },
};

/* ─── Quick-Start Step Illustrations ─────────────────────── */
function IllustrationUpload() {
  return (
    <div style={{
      width: 80, height: 64, borderRadius: 10,
      border: "2px dashed rgba(56,189,248,0.5)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 6, background: "rgba(56,189,248,0.04)",
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 4v12M8 8l4-4 4 4" stroke="var(--accent-cyan)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div style={{ display: "flex", gap: 3 }}>
        {["WAV","MP3","FLAC"].map(f => (
          <span key={f} style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "rgba(56,189,248,0.12)", color: "var(--accent-cyan)" }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

function IllustrationPlatform() {
  const platforms = [
    { icon: Music, name: "Spotify", active: true },
    { icon: Disc, name: "Apple" },
    { icon: Play, name: "YT" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 80 }}>
      {platforms.map(p => (
        <div key={p.name} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "3px 6px",
          borderRadius: 6, fontSize: 9, fontWeight: 600,
          background: p.active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${p.active ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}`,
          color: p.active ? "var(--accent-purple)" : "var(--text-muted)",
        }}>
          <p.icon size={10} strokeWidth={2} />
          {p.name}
          {p.active && <span style={{ marginLeft: "auto", color: "var(--accent-cyan)", fontSize: 8 }}>✓</span>}
        </div>
      ))}
    </div>
  );
}

function IllustrationKeyM() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 10,
        background: "linear-gradient(145deg, rgba(196,181,253,0.2), rgba(196,181,253,0.05))",
        border: "2px solid rgba(196,181,253,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, fontWeight: 800, color: "var(--accent-gold)",
        fontFamily: "var(--font-mono, monospace)",
        boxShadow: "0 4px 0 rgba(196,181,253,0.3), 0 0 12px rgba(196,181,253,0.15)",
      }}>M</div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="var(--accent-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(56,189,248,0.15)",
        border: "2px solid rgba(56,189,248,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, color: "var(--accent-cyan)",
      }}>✓</div>
    </div>
  );
}

function IllustrationDownload() {
  const formats = ["WAV 32", "FLAC 24", "MP3 320", "AAC"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, width: 88 }}>
      {formats.map((f, i) => (
        <div key={f} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "2px 6px", borderRadius: 4, fontSize: 8,
          background: i === 0 ? "rgba(196,181,253,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${i === 0 ? "rgba(196,181,253,0.3)" : "rgba(255,255,255,0.06)"}`,
          color: i === 0 ? "var(--accent-gold)" : "var(--text-muted)",
        }}>
          <span>{f}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 2v5M2.5 5.5L5 8l2.5-2.5M1 9h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ─── Visualizer Mini Illustrations ─────────────────────── */
function MiniSpectrum() {
  const bars = [3,6,4,9,12,10,7,11,8,5,4,7,9,6,3];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32, padding: "0 4px" }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width: 6, height: h * 2, borderRadius: "2px 2px 0 0",
          background: `hsl(${170 + i * 4}, 80%, 60%)`,
          opacity: 0.85,
          animation: `specPulse${i % 3} ${1.2 + (i % 4) * 0.3}s ease-in-out infinite alternate`,
        }}/>
      ))}
    </div>
  );
}

function MiniWaveform() {
  const pts = "0,16 8,8 16,20 24,4 32,18 40,10 48,22 56,6 64,16 72,12 80,20 88,8 96,16";
  return (
    <svg width={96} height={32} viewBox="0 0 96 32" style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {[24,56].map(x => (
        <rect key={x} x={x-1} y={0} width={2} height={32} fill="rgba(255,50,50,0.5)" rx={1}/>
      ))}
    </svg>
  );
}

function MiniLissajous() {
  return (
    <svg width={60} height={60} viewBox="-30 -30 60 60">
      <ellipse cx={0} cy={0} rx={18} ry={24} fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth={1.5}
        transform="rotate(-25)"/>
      <ellipse cx={0} cy={0} rx={8} ry={14} fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth={1}
        transform="rotate(-25)"/>
      <line x1={-26} y1={0} x2={26} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>
      <line x1={0} y1={-26} x2={0} y2={26} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>
    </svg>
  );
}

function MiniLUFSMeter() {
  const segs = [
    { y: 0,  h: 8,  c: "rgba(255,60,60,0.7)" },
    { y: 10, h: 8,  c: "rgba(196,181,253,0.7)" },
    { y: 20, h: 8,  c: "rgba(196,181,253,0.5)" },
    { y: 30, h: 10, c: "rgba(56,189,248,0.7)" },
    { y: 42, h: 10, c: "rgba(56,189,248,0.5)" },
    { y: 54, h: 10, c: "rgba(56,189,248,0.3)" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, height: 64 }}>
      {[0,1].map(col => (
        <div key={col} style={{ display: "flex", flexDirection: "column", gap: 2, width: 10 }}>
          {segs.map((s, i) => (
            <div key={i} style={{ height: s.h, borderRadius: 2, background: i < (col === 0 ? 4 : 3) ? s.c : "rgba(255,255,255,0.06)" }}/>
          ))}
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingLeft: 2 }}>
        {["-9","-14","-20","-30"].map(l => (
          <span key={l} style={{ fontSize: 7, color: "var(--text-muted)", fontFamily: "monospace" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function MiniSpectrogram() {
  const rows = 8;
  const cols = 16;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: 1 }}>
          {Array.from({ length: cols }).map((_, c) => {
            const brightness = Math.max(0, 0.9 - Math.abs(c - 5) * 0.07 - r * 0.06 + Math.random() * 0.15);
            return (
              <div key={c} style={{
                width: 8, height: 5, borderRadius: 1,
                background: `rgba(${Math.round(brightness * 100)}, ${Math.round(brightness * 180)}, ${Math.round(brightness * 80)}, ${brightness + 0.1})`,
              }}/>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─── Visualizer Explainer Cards ─────────────────────────── */
const VISUALIZERS = [
  {
    key: "spectrum",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="8" width="2" height="7" rx="1" fill="currentColor" opacity=".6"/>
        <rect x="4" y="5" width="2" height="10" rx="1" fill="currentColor" opacity=".7"/>
        <rect x="7" y="3" width="2" height="12" rx="1" fill="currentColor"/>
        <rect x="10" y="6" width="2" height="9" rx="1" fill="currentColor" opacity=".8"/>
        <rect x="13" y="9" width="2" height="6" rx="1" fill="currentColor" opacity=".5"/>
      </svg>
    ),
    color: "var(--accent-cyan)",
    titleDe: "Spectrum Analyzer",   titleEn: "Spectrum Analyzer",
    descDe: "Live-Ansicht der Energieverteilung über alle Frequenzen: horizontal liegt die Frequenz (20 Hz – 20 kHz), vertikal der Pegel in dB.",
    descEn: "A live read of how energy spreads across the spectrum — frequency runs left to right (20 Hz – 20 kHz), level in dB runs bottom to top.",
    visual: <MiniSpectrum />,
  },
  {
    key: "waveform",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M1 8 Q3 4 5 8 Q7 12 9 8 Q11 4 13 8 Q15 12 16 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    color: "var(--accent-purple)",
    titleDe: "Wellenform + Clip-Marker",   titleEn: "Waveform + Clip Markers",
    descDe: "Rot markierte Abschnitte weisen auf mögliches Clipping hin (> −0.17 dBFS) — nach dem Mastering sollten diese Markierungen verschwunden sein.",
    descEn: "Sections flagged in red point to possible clipping (> −0.17 dBFS) — those flags should be gone once the track is mastered.",
    visual: <MiniWaveform />,
  },
  {
    key: "lissajous",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <ellipse cx="8" cy="8" rx="4" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-25 8 8)"/>
        <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="0.5" opacity=".4"/>
        <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="0.5" opacity=".4"/>
      </svg>
    ),
    color: "#38bdf8",
    titleDe: "Stereofeld (Lissajous)",   titleEn: "Stereo Field (Lissajous)",
    descDe: "Eine senkrechte Linie steht für Mono, eine Ellipse für Stereo, ein breiter Kreis für ein sehr breites Klangbild. Ist der Korrelationswert positiv, ist der Track mono-kompatibel.",
    descEn: "A straight vertical line means mono, an ellipse means stereo, and a wide circle means a very wide image. A positive correlation value tells you it's mono-compatible.",
    visual: <MiniLissajous />,
  },
  {
    key: "lufs",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2" width="3" height="12" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="3" y="2" width="3" height="7" rx="1" fill="currentColor"/>
        <rect x="10" y="2" width="3" height="12" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="10" y="2" width="3" height="5" rx="1" fill="currentColor"/>
      </svg>
    ),
    color: "var(--accent-gold)",
    titleDe: "LUFS-Meter",   titleEn: "LUFS Meter",
    descDe: "Misst die integrierte Lautheit in LUFS. Im grünen Bereich passt der Pegel zu den Streaming-Vorgaben, im roten Bereich ist er zu laut und wird von den Plattformen automatisch heruntergeregelt.",
    descEn: "Tracks integrated loudness in LUFS. Green means you're within streaming norms; red means you're too hot and the platform will turn it down for you automatically.",
    visual: <MiniLUFSMeter />,
  },
  {
    key: "spectrogram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="14" height="14" rx="2" fill="rgba(56,189,248,0.1)" stroke="currentColor" strokeWidth="1" opacity=".5"/>
        <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" opacity=".8"/>
        <rect x="9" y="3" width="4" height="4" rx="1" fill="currentColor" opacity=".4"/>
        <rect x="3" y="9" width="4" height="4" rx="1" fill="currentColor" opacity=".3"/>
        <rect x="9" y="9" width="4" height="4" rx="1" fill="currentColor" opacity=".6"/>
      </svg>
    ),
    color: "#8b5cf6",
    titleDe: "Spectrogram Waterfall",   titleEn: "Spectrogram Waterfall",
    descDe: "Horizontal die Frequenz, vertikal der Zeitverlauf, die Farbe steht für die Intensität. So siehst du auf einen Blick, welche Frequenzen wann aktiv sind — praktisch für die Transienten-Analyse.",
    descEn: "Frequency across, time down, colour for intensity — a quick way to see which frequencies are active and when, handy for checking transients.",
    visual: <MiniSpectrogram />,
  },
];

/* ─── FAQ Data ─────────────────────────────────────────────── */
const FAQ_CATEGORIES = [
  {
    id: "start",
    color: "var(--accent-purple)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7 4v4M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    titleDe: "Erste Schritte", titleEn: "Getting Started",
    items: [
      {
        qDe: "Wie läuft das Mastering bei Beatzucker ab?",
        qEn: "What actually happens when I master a track here?",
        aDe: "Du lädst deine WAV- oder MP3-Datei hoch, legst Zielplattform und Genre-Preset fest und regelst die Mastering-Intensität. Ein Klick auf Mastern (oder die Taste M) genügt: Die Engine analysiert dein Audio, leitet passende Parameter ab und schickt den Track durch eine 12-stufige DSP-Pipeline.",
        aEn: "Upload a WAV or MP3, pick a target platform and genre preset, and dial in the mastering intensity. One click on Master (or a tap of M) starts the engine: it measures your audio, derives suitable parameters, and runs the track through a 12-stage DSP pipeline.",
      },
      {
        qDe: "Welche Formate kann ich hoch- und runterladen?",
        qEn: "Which formats does upload and export support?",
        aDe: "Hochladen kannst du WAV (jede Bit-Tiefe), MP3, FLAC und AIFF. Für den Download stehen dir WAV 32-bit Float, WAV 24-bit, WAV 16-bit (mit Dither), FLAC 24-bit, MP3 320 kbps, MP3 128 kbps und AAC 256 kbps zur Verfügung.",
        aEn: "You can upload WAV (any bit depth), MP3, FLAC, or AIFF. On the way out, choose from WAV 32-bit Float, WAV 24-bit, WAV 16-bit (dithered), FLAC 24-bit, MP3 320 kbps, MP3 128 kbps, or AAC 256 kbps.",
      },
      {
        qDe: "Wie lange muss ich aufs Mastering warten?",
        qEn: "How long does the process take?",
        aDe: "Die Analyse selbst ist nach 5–10 Sekunden durch. Das komplette Mastering — inklusive DSP-Pipeline und aller Exportformate — braucht je nach Tracklänge zwischen 30 Sekunden und 3 Minuten, mit Fortschrittsanzeige in Echtzeit.",
        aEn: "Analysis wraps up in about 5–10 seconds. The full run — DSP pipeline plus every export format — takes anywhere from 30 seconds to 3 minutes depending on how long your track is, with a live progress indicator the whole time.",
      },
      {
        qDe: "Kostet mich das Ganze wirklich nichts?",
        qEn: "Is this genuinely free, no catch?",
        aDe: "Genau. Auto AI, Referenz-Track-Mastering und sämtliche Exportformate bis hin zu WAV 32-bit sind kostenlos nutzbar, ganz ohne Abo. Lediglich ein faires Tageslimit pro Account bewahrt die Server vor Überlastung.",
        aEn: "Yes, no catch. Auto AI, reference-track mastering, and every export format up to WAV 32-bit are free, no subscription attached. The only guardrail is a fair per-account daily limit that keeps the servers from buckling.",
      },
    ],
  },
  {
    id: "mastering",
    color: "var(--accent-cyan)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 10V7M5 10V4M8 10V6M11 10V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    titleDe: "Mastering", titleEn: "Mastering",
    items: [
      {
        qDe: "Wofür ist der Intensity-Regler gut?",
        qEn: "What does the intensity control actually change?",
        aDe: "Der Regler (0–100 %) bestimmt, wie kräftig bearbeitet wird: bei 0 % passiert kaum etwas, bei 100 % greifen volle Kompression, deutliche EQ-Eingriffe und starke Sättigung. Für die meisten Tracks empfiehlt sich ein Startwert um 65 %.",
        aEn: "The slider (0–100%) sets how hard the processing hits: near 0% it barely touches the signal, at 100% you get full compression, heavy EQ moves, and full saturation. 65% is a solid starting point for most tracks.",
      },
      {
        qDe: "Was steckt hinter den Plattform-Presets?",
        qEn: "What do the platform presets actually set?",
        aDe: "Jedes Preset zielt auf einen anderen Loudness-Standard: Spotify –14 LUFS, Apple Music –16 LUFS, YouTube –14 LUFS, Club/DJ –9 LUFS (entsprechend laut), und bei Custom stellst du frei ein. Die True-Peak-Grenze bleibt in jedem Fall bei –1 dBTP.",
        aEn: "Each preset targets a different loudness standard: Spotify sits at –14 LUFS, Apple Music at –16 LUFS, YouTube at –14 LUFS, Club/DJ at –9 LUFS (properly loud), and Custom lets you set your own number. True peak ceiling stays fixed at –1 dBTP regardless.",
      },
      {
        qDe: "Wie funktioniert das Mastering nach Referenz-Track?",
        qEn: "How does reference-track mastering work?",
        aDe: "Du lädst einen Track hoch, dessen Sound dir gefällt. Beatzucker analysiert dessen Spektralbalance, Loudness, Dynamik und Stereobreite und richtet dein Mastering danach aus — ein Prinzip, das auch professionelle Studios nutzen. Diese Funktion ist für alle kostenlos.",
        aEn: "Upload a track whose sound you want to chase. Beatzucker reads its spectral balance, loudness, dynamics, and stereo width, then steers your mastering toward that target — the same principle pro studios use. It's free for everyone.",
      },
      {
        qDe: "Was macht das M/S-Processing genau?",
        qEn: "What is Mid/Side processing doing under the hood?",
        aDe: "Beim Mid/Side-Processing wird das Stereosignal in eine Mitte (Mid = L+R) und eine Seite (Side = L–R) aufgeteilt, sodass Breite und Tiefe getrennt voneinander bearbeitet werden können. Beatzucker filtert zusätzlich automatisch Frequenzen unter 120 Hz aus dem Seitenkanal, damit der Track auch im Club sauber klingt.",
        aEn: "Mid/Side processing splits the stereo signal into a centre component (Mid = L+R) and a side component (Side = L–R), so width and depth can be shaped independently. Beatzucker also strips frequencies below 120 Hz from the side channel automatically, keeping things tight for club playback.",
      },
      {
        qDe: "Warum ist Mono-Kompatibilität wichtig?",
        qEn: "Why does mono compatibility matter?",
        aDe: "Ein mono-kompatibler Track behält seinen Klang, wenn er auf einem einzelnen Lautsprecher, Handy oder Club-System zusammengemischt wird. Im Stereofeld-Vektorskop erkennst du das an einem positiven Korrelationswert — Beatzucker zeigt dir diesen Wert direkt in der Analyse.",
        aEn: "A mono-compatible track still sounds right when it's summed down to a single speaker, a phone, or a club rig. You can spot it in the stereo field vectorscope as a positive correlation value — Beatzucker surfaces that number right in the analysis.",
      },
    ],
  },
  {
    id: "analysis",
    color: "var(--accent-gold)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 9l2-2 2 2 2-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    titleDe: "Analyse & Visualizer", titleEn: "Analysis & Visualizers",
    items: [
      {
        qDe: "Was genau vergleicht der A/B-Player?",
        qEn: "What is the A/B player comparing?",
        aDe: "A spielt dein hochgeladenes Original, B den fertigen Master. Du kannst jederzeit zwischen beiden hin- und herschalten, ohne dass die Wiedergabe stoppt. Sämtliche Visualisierungen — Spektrum, Wellenform, Stereofeld, LUFS, Spectrogram — folgen dabei in Echtzeit der aktuellen Quelle.",
        aEn: "A is your original upload, B is the finished master. Flip between them whenever you like — playback never pauses. Every visualisation (spectrum, waveform, stereo field, LUFS, spectrogram) updates in real time to whichever one is playing.",
      },
      {
        qDe: "Wofür stehen die roten Markierungen in der Wellenform?",
        qEn: "What do the red markers on the waveform mean?",
        aDe: "Sie kennzeichnen Stellen, an denen der Peak-Pegel 0.98 (–0.17 dBFS) überschreitet — mögliche Clipping-Zonen im Originalmaterial. Nach dem Mastering sollte davon dank True Peak Limiter nichts mehr übrig sein.",
        aEn: "They flag spots where the peak level crosses 0.98 (–0.17 dBFS) — potential clipping in the original file. Once mastering runs, the True Peak Limiter should have cleaned all of that up.",
      },
      {
        qDe: "Wie liest man den Spectrogram Waterfall?",
        qEn: "How do I read the spectrogram waterfall?",
        aDe: "Waagerecht liegt die Frequenz (20 Hz–20 kHz), senkrecht die Zeit, und die Farbe zeigt die Lautstärke (schwarz = leise, weiß = laut). Damit siehst du genau, wann welche Frequenzbereiche aktiv sind — nützlich für Transienten und Arrangement.",
        aEn: "Frequency runs horizontally (20 Hz–20 kHz), time runs vertically, and colour encodes loudness (black = quiet, white = loud). It's a fast way to see exactly when each frequency range kicks in — useful for transients and arrangement checks.",
      },
      {
        qDe: "Was genau misst LUFS?",
        qEn: "What is LUFS actually measuring?",
        aDe: "LUFS steht für Loudness Units Full Scale, der gängige Maßstab für Lautheit auf Streaming-Plattformen. Spotify normalisiert beispielsweise auf –14 LUFS und dreht lautere Tracks automatisch leiser. Beatzucker bringt deinen Track direkt auf den passenden LUFS-Zielwert.",
        aEn: "LUFS — Loudness Units Full Scale — is the standard loudness metric streaming platforms use. Spotify, for instance, normalises to –14 LUFS and quietly turns down anything louder. Beatzucker lands your track right on the target LUFS value up front.",
      },
    ],
  },
  {
    id: "technical",
    color: "var(--accent-cyan)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 2L2 5l3 3M9 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 1l-2 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
    titleDe: "Technisches", titleEn: "Technical",
    items: [
      {
        qDe: "Was passiert mit meinen hochgeladenen Dateien?",
        qEn: "What happens to the files I upload?",
        aDe: "Deine hochgeladenen Original-Dateien werden gelöscht, sobald die Verarbeitung abgeschlossen ist — spätestens nach 60 Minuten. Die fertigen Mastering-Ergebnisse bleiben 24 Stunden verfügbar und werden danach automatisch entfernt. Es gibt keine dauerhafte Speicherung und keine Weitergabe an Dritte.",
        aEn: "Your original uploads are removed as soon as processing finishes — within 60 minutes at the latest. Finished masters stick around for 24 hours before being deleted automatically. Nothing is stored long-term, and nothing is shared with third parties.",
      },
      {
        qDe: "Läuft Beatzucker in jedem Browser?",
        qEn: "Does Beatzucker work in any browser?",
        aDe: "In allen gängigen aktuellen Browsern: Chrome ab 90, Firefox ab 88, Safari ab 14, Edge ab 90. Die Visualisierungen brauchen die Web Audio API, die in all diesen Browsern vorhanden ist.",
        aEn: "Yes, in any current mainstream browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. The visualisations rely on the Web Audio API, which all of those support out of the box.",
      },
      {
        qDe: "Wozu dient die Taste M?",
        qEn: "What's the M key for?",
        aDe: "M startet das Mastering — genau wie ein Klick auf den Mastern-Button, nur schneller. Praktisch, wenn du gleich mehrere Tracks hintereinander bearbeitest. Mit der Leertaste steuerst du Start und Stopp der Wiedergabe.",
        aEn: "M kicks off mastering — same result as clicking the Master button, just faster. Handy when you're running several tracks back to back. Space bar handles play/stop.",
      },
      {
        qDe: "Kann ich mehrere Tracks nacheinander mastern?",
        qEn: "Can I master several tracks one after another?",
        aDe: "Klar — Track auswählen, Parameter setzen, M drücken, Download abwarten, dann den nächsten Track hochladen und von vorn. Im Mastering-Verlauf bleiben die Metadaten aller bisherigen Durchläufe erhalten (Dateiname, LUFS-Werte, Parameter), die Audiodateien selbst lassen sich aber nur innerhalb des 24-Stunden-Fensters herunterladen.",
        aEn: "Sure — pick a track, set your parameters, press M, wait for the download, then upload the next one and repeat. Your mastering history keeps the metadata for every past run (file name, LUFS values, parameters), though the actual audio files are only downloadable within that 24-hour window.",
      },
      {
        qDe: "Wie viel Zeit bleibt mir, um herunterzuladen?",
        qEn: "How much time do I have to grab my download?",
        aDe: "Ab Fertigstellung hast du 24 Stunden Zeit, deinen Master herunterzuladen. Danach werden die Dateien automatisch und endgültig gelöscht — also nicht zu lange warten!",
        aEn: "You've got 24 hours from completion to download your master. After that, files are wiped automatically and permanently — so don't sit on it too long.",
      },
      {
        qDe: "Kostet die Nutzung von Auto AI extra?",
        qEn: "Does Auto AI cost anything extra?",
        aDe: "Nein. Auto AI wertet dein Audio aus — Genre, Dynamik, Spektralbalance — und wählt darauf basierend passende Mastering-Parameter, komplett kostenlos und ohne eigenes Limit über das ohnehin faire Tageslimit hinaus.",
        aEn: "No. Auto AI reads your audio — genre, dynamics, spectral balance — and picks matching mastering parameters accordingly, entirely free and with no separate cap beyond the standard fair daily limit.",
      },
    ],
  },
];

/* ─── FAQ Item (Accordion) ─────────────────────────────────── */
function FaqItem({ qDe, qEn, aDe, aEn, color, lang }: {
  qDe: string; qEn: string; aDe: string; aEn: string; color: string; lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: `1px solid ${open ? color.replace(")", ", 0.3)").replace("var(", "rgba(").replace("--accent-cyan", "56,189,248").replace("--accent-purple", "139,92,246") || "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "1.1rem 1.5rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "none", border: "none", cursor: "pointer",
          textAlign: "left", fontWeight: 600, fontSize: "0.925rem",
          color: "var(--text-primary)",
        }}
      >
        <span>{lang === "de" ? qDe : qEn}</span>
        <span style={{
          color, fontSize: "1.1rem", flexShrink: 0, marginLeft: "1rem",
          transform: open ? "rotate(45deg)" : "none",
          transition: "transform 0.2s",
          display: "inline-block",
        }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? 400 : 0,
        overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}>
        <div style={{
          padding: "0 1.5rem 1.25rem",
          color: "var(--text-secondary)",
          fontSize: "0.875rem", lineHeight: 1.75,
        }}>
          {lang === "de" ? aDe : aEn}
        </div>
      </div>
    </div>
  );
}

/* ─── Keyboard Key ───────────────────────────────────────── */
function KbdKey({ k, wide }: { k: string; wide?: boolean }) {
  return (
    <div style={{
      minWidth: wide ? 72 : 44, height: 44, padding: "0 8px",
      borderRadius: 8,
      background: "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderBottom: "3px solid rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: wide ? 11 : 16, fontWeight: 700,
      color: "var(--text-primary)",
      fontFamily: "var(--font-mono, monospace)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      userSelect: "none",
      flexShrink: 0,
    }}>
      {k}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function HelpPage({ initialLang = "de" }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [search, setSearch] = useState("");
  const changeLanguage = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    window.location.href = next === "en" ? "/en/help" : "/help";
  };

  // ─ Filter FAQ
  const filtered = useMemo(() => {
    if (!search.trim()) return FAQ_CATEGORIES;
    const q = search.toLowerCase();
    return FAQ_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.qDe.toLowerCase().includes(q) ||
        item.qEn.toLowerCase().includes(q) ||
        item.aDe.toLowerCase().includes(q) ||
        item.aEn.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [search]);

  const qsSteps = T.qs_steps[lang];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <BreadcrumbJsonLd name={lang === "en" ? "Help" : "Hilfe"} url={lang === "en" ? "https://beatzucker.de/en/help" : "https://beatzucker.de/help"} />
      <Header lang={lang} />

      {/* ── Language Toggle ── */}
      <div style={{ position: "fixed", top: 80, right: 16, zIndex: 40 }}>
        <div style={{
          display: "flex", borderRadius: 8, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
        }}>
          {(["de","en"] as Lang[]).map(l => (
            <button key={l} onClick={() => changeLanguage(l)} style={{
              padding: "5px 12px", border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: lang === l ? "rgba(139,92,246,0.25)" : "transparent",
              color: lang === l ? "var(--accent-purple)" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "7rem 2rem 3rem" }}>
        <div style={{
          display: "inline-block", background: "rgba(56,189,248,0.1)",
          border: "1px solid rgba(56,189,248,0.25)", borderRadius: 6,
          padding: "0.25rem 0.75rem", fontSize: "0.75rem",
          color: "var(--accent-cyan)", letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: "1.5rem",
        }}>{t(T.hero_badge, lang)}</div>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem" }}>
          {t(T.hero_h1, lang)}
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto 0.5rem" }}>
          {t(T.hero_sub, lang)}{" "}
          {t(T.hero_contact, lang)}{" "}
          <a href="mailto:info@re-beatz.com" style={{ color: "var(--accent-cyan)" }}>info@re-beatz.com</a>
        </p>

        {/* Search */}
        <div style={{ maxWidth: 440, margin: "1.5rem auto 0", position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="var(--text-muted)" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(T.search_ph, lang)}
            style={{
              width: "100%", padding: "0.75rem 1rem 0.75rem 2.75rem",
              background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, color: "var(--text-primary)", fontSize: "0.9rem",
              outline: "none", boxSizing: "border-box",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 16, lineHeight: 1,
            }}>×</button>
          )}
        </div>
      </section>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "0 2rem 5rem" }}>

        {/* ── Quick Start ── */}
        {!search && (
          <section style={{ marginBottom: "4rem" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div className="label" style={{ marginBottom: "0.5rem", color: "var(--accent-purple)" }}>
                {t(T.qs_title, lang)}
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                {t(T.qs_sub, lang)}
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {qsSteps.map((step, i) => {
                const illustrations = [
                  <IllustrationUpload key="up" />,
                  <IllustrationPlatform key="pl" />,
                  <IllustrationKeyM key="key" />,
                  <IllustrationDownload key="dl" />,
                ];
                const colors = ["var(--accent-cyan)", "var(--accent-purple)", "var(--accent-gold)", "#38bdf8"];
                return (
                  <div key={i} style={{
                    background: "var(--bg-secondary)",
                    border: `1px solid ${colors[i].replace("var(--accent-cyan)","rgba(56,189,248,0.2)").replace("var(--accent-purple)","rgba(139,92,246,0.2)").replace("var(--accent-gold)","rgba(196,181,253,0.2)").replace("#38bdf8","rgba(56,189,248,0.2)")}`,
                    borderRadius: 14, padding: "1.25rem",
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
                    position: "relative",
                  }}>
                    <div style={{
                      fontSize: "1.8rem", fontWeight: 900, lineHeight: 1,
                      color: colors[i].replace("var(--accent-cyan)","rgba(56,189,248,0.15)").replace("var(--accent-purple)","rgba(139,92,246,0.15)").replace("var(--accent-gold)","rgba(196,181,253,0.15)").replace("#38bdf8","rgba(56,189,248,0.15)"),
                      fontFamily: "var(--font-mono, monospace)",
                      position: "absolute", top: 10, right: 14,
                    }}>{step.n}</div>
                    {illustrations[i]}
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {step.desc}
                      </div>
                    </div>
                    {i < 3 && (
                      <div style={{
                        position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
                        color: "var(--text-muted)", fontSize: 16, zIndex: 1, display: "none",
                      }}>→</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Keyboard Shortcuts ── */}
        {!search && (
          <section style={{ marginBottom: "4rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div className="label" style={{ marginBottom: "0.5rem", color: "var(--accent-gold)" }}>
                {t(T.kbd_title, lang)}
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                {t(T.kbd_sub, lang)}
              </h2>
            </div>
            <div style={{
              background: "var(--bg-secondary)",
              border: "1px solid rgba(196,181,253,0.15)",
              borderRadius: 16, padding: "1.75rem 2rem",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                {T.kbd_keys[lang].map((k) => (
                  <div key={k.key} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <KbdKey k={k.key} wide={k.key === "Space"} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="rgba(196,181,253,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{k.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Visualizer Guide ── */}
        {!search && (
          <section style={{ marginBottom: "4rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div className="label" style={{ marginBottom: "0.5rem", color: "var(--accent-cyan)" }}>
                {t(T.viz_title, lang)}
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                {t(T.viz_sub, lang)}
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {VISUALIZERS.map((v) => (
                <div key={v.key} style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12, padding: "1.25rem",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: v.color }}>{v.icon}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: v.color }}>
                      {lang === "de" ? v.titleDe : v.titleEn}
                    </span>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0.75rem",
                    background: "rgba(0,0,0,0.2)", borderRadius: 8,
                    minHeight: 64,
                  }}>
                    {v.visual}
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                    {lang === "de" ? v.descDe : v.descEn}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        <section style={{ marginBottom: "3rem" }}>
          {!search && (
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div className="label" style={{ marginBottom: "0.5rem", color: "var(--accent-purple)" }}>
                {t(T.faq_title, lang)}
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
              {t(T.faq_no_res, lang)}
            </p>
          ) : (
            filtered.map((cat) => (
              <div key={cat.id} style={{ marginBottom: "2.5rem" }}>
                {/* Category header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem",
                }}>
                  <span style={{ color: cat.color }}>{cat.icon}</span>
                  <h2 style={{
                    fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: cat.color, margin: 0,
                  }}>
                    {lang === "de" ? cat.titleDe : cat.titleEn}
                  </h2>
                </div>
                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cat.items.map((item) => (
                    <FaqItem
                      key={item.qDe}
                      qDe={item.qDe} qEn={item.qEn}
                      aDe={item.aDe} aEn={item.aEn}
                      color={cat.color} lang={lang}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── Contact CTA ── */}
        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 16, padding: "2rem",
          textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="var(--accent-purple)" strokeWidth="1.4"/>
              <path d="M2 5l8 6 8-6" stroke="var(--accent-purple)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {t(T.cta_h3, lang)}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            {t(T.cta_sub, lang)}
          </p>
          <a href="mailto:info@re-beatz.com" style={{
            background: "var(--accent-purple)", color: "#fff",
            padding: "0.625rem 1.5rem", borderRadius: 8,
            textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
            display: "inline-block",
          }}>
            info@re-beatz.com
          </a>
        </div>

      </main>

      <Footer lang={lang} />
      <ScrollToTop lang={lang} />

      {/* ── Animation Keyframes ── */}
      <style>{`
        @keyframes specPulse0 { from { height: 8px } to { height: 20px } }
        @keyframes specPulse1 { from { height: 14px } to { height: 6px } }
        @keyframes specPulse2 { from { height: 10px } to { height: 24px } }
        input::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  );
}
