"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

/* ─── Types ─────────────────────────────────────────────── */
type Lang = "de" | "en";
interface Bilingual { de: string; en: string; }
const t = (o: Bilingual, lang: Lang) => o[lang];

/* ─── Bilingual Strings ──────────────────────────────────── */
const T = {
  hero_badge:   { de: "Hilfe & FAQ", en: "Help & FAQ" },
  hero_h1:      { de: "Wie kann ich dir helfen?", en: "How can I help you?" },
  hero_sub:     { de: "Antworten auf die häufigsten Fragen zu UpMaDo.", en: "Answers to the most common questions about UpMaDo." },
  hero_contact: { de: "Nicht gefunden? Schreib uns:", en: "Not found? Contact us:" },
  search_ph:    { de: "FAQ durchsuchen…", en: "Search FAQ…" },
  qs_title:     { de: "Schnellstart", en: "Quick Start" },
  qs_sub:       { de: "In 4 Schritten zum perfekten Master", en: "4 steps to a perfect master" },
  qs_steps: {
    de: [
      { n: "01", title: "Track hochladen", desc: "WAV, MP3, FLAC oder AIFF per Drag & Drop oder Klick." },
      { n: "02", title: "Plattform & Genre wählen", desc: "Wähle Zielplattform (Spotify, Apple Music, Club…) und Stil." },
      { n: "03", title: "\"M\" drücken", desc: "Klick auf Mastern oder Taste M — die KI übernimmt." },
      { n: "04", title: "Download", desc: "WAV 32-bit, FLAC 24-bit, MP3 320 und mehr auf einen Klick." },
    ],
    en: [
      { n: "01", title: "Upload your track", desc: "WAV, MP3, FLAC or AIFF via drag & drop or click." },
      { n: "02", title: "Choose platform & genre", desc: "Select target platform (Spotify, Apple Music, Club…) and style." },
      { n: "03", title: "Press \"M\"", desc: "Click Master or press M — the AI takes over." },
      { n: "04", title: "Download", desc: "WAV 32-bit, FLAC 24-bit, MP3 320 and more in one click." },
    ],
  },
  kbd_title: { de: "Tastaturkürzel", en: "Keyboard Shortcuts" },
  kbd_sub:   { de: "Schneller arbeiten mit Shortcuts", en: "Work faster with shortcuts" },
  kbd_keys: {
    de: [
      { key: "M",      desc: "Mastering starten" },
      { key: "Space",  desc: "Play / Pause" },
      { key: "A",      desc: "Original abspielen" },
      { key: "B",      desc: "Master abspielen" },
    ],
    en: [
      { key: "M",      desc: "Start mastering" },
      { key: "Space",  desc: "Play / Pause" },
      { key: "A",      desc: "Play original" },
      { key: "B",      desc: "Play master" },
    ],
  },
  viz_title: { de: "Visualizer verstehen", en: "Understanding Visualizers" },
  viz_sub:   { de: "Was zeigen die verschiedenen Analysen?", en: "What do the different analyses show?" },
  faq_title:   { de: "Häufige Fragen", en: "Frequently Asked Questions" },
  faq_no_res:  { de: "Keine Ergebnisse gefunden.", en: "No results found." },
  cta_h3:      { de: "Noch Fragen?", en: "Still have questions?" },
  cta_sub:     { de: "Wir antworten innerhalb von 24 Stunden.", en: "We reply within 24 hours." },
};

/* ─── Quick-Start Step Illustrations ─────────────────────── */
function IllustrationUpload() {
  return (
    <div style={{
      width: 80, height: 64, borderRadius: 10,
      border: "2px dashed rgba(0,229,196,0.5)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 6, background: "rgba(0,229,196,0.04)",
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 4v12M8 8l4-4 4 4" stroke="var(--accent-cyan)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="rgba(0,229,196,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div style={{ display: "flex", gap: 3 }}>
        {["WAV","MP3","FLAC"].map(f => (
          <span key={f} style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "rgba(0,229,196,0.12)", color: "var(--accent-cyan)" }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

function IllustrationPlatform() {
  const platforms = [
    { icon: "🎵", name: "Spotify", active: true },
    { icon: "🍎", name: "Apple" },
    { icon: "▶", name: "YT" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 80 }}>
      {platforms.map(p => (
        <div key={p.name} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "3px 6px",
          borderRadius: 6, fontSize: 9, fontWeight: 600,
          background: p.active ? "rgba(124,111,255,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${p.active ? "rgba(124,111,255,0.4)" : "rgba(255,255,255,0.06)"}`,
          color: p.active ? "var(--accent-purple)" : "var(--text-muted)",
        }}>
          <span style={{ fontSize: 10 }}>{p.icon}</span>
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
        background: "linear-gradient(145deg, rgba(245,200,66,0.2), rgba(245,200,66,0.05))",
        border: "2px solid rgba(245,200,66,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, fontWeight: 800, color: "var(--accent-gold)",
        fontFamily: "var(--font-mono, monospace)",
        boxShadow: "0 4px 0 rgba(245,200,66,0.3), 0 0 12px rgba(245,200,66,0.15)",
      }}>M</div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="var(--accent-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(0,229,196,0.15)",
        border: "2px solid rgba(0,229,196,0.4)",
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
          background: i === 0 ? "rgba(245,200,66,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${i === 0 ? "rgba(245,200,66,0.3)" : "rgba(255,255,255,0.06)"}`,
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
      <ellipse cx={0} cy={0} rx={18} ry={24} fill="none" stroke="rgba(0,229,196,0.5)" strokeWidth={1.5}
        transform="rotate(-25)"/>
      <ellipse cx={0} cy={0} rx={8} ry={14} fill="none" stroke="rgba(0,229,196,0.25)" strokeWidth={1}
        transform="rotate(-25)"/>
      <line x1={-26} y1={0} x2={26} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>
      <line x1={0} y1={-26} x2={0} y2={26} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>
    </svg>
  );
}

function MiniLUFSMeter() {
  const segs = [
    { y: 0,  h: 8,  c: "rgba(255,60,60,0.7)" },
    { y: 10, h: 8,  c: "rgba(245,200,66,0.7)" },
    { y: 20, h: 8,  c: "rgba(245,200,66,0.5)" },
    { y: 30, h: 10, c: "rgba(0,229,196,0.7)" },
    { y: 42, h: 10, c: "rgba(0,229,196,0.5)" },
    { y: 54, h: 10, c: "rgba(0,229,196,0.3)" },
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
    descDe: "Zeigt die Energie jeder Frequenz in Echtzeit. X-Achse = Frequenz (20 Hz – 20 kHz), Y-Achse = Lautstärke in dB.",
    descEn: "Shows the energy at each frequency in real time. X-axis = frequency (20 Hz – 20 kHz), Y-axis = level in dB.",
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
    descDe: "Rote Balken zeigen Stellen mit möglichem Clipping (> −0.17 dBFS). Im gemasterten Track sollten sie verschwunden sein.",
    descEn: "Red bars show potential clipping (> −0.17 dBFS). They should be gone in the mastered track.",
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
    color: "#06b6d4",
    titleDe: "Stereofeld (Lissajous)",   titleEn: "Stereo Field (Lissajous)",
    descDe: "Vertikale Linie = Mono, Ellipse = Stereo, breiter Kreis = sehr breit. Positiver Korrelationswert = mono-kompatibel.",
    descEn: "Vertical line = mono, ellipse = stereo, wide circle = very wide. Positive correlation = mono-compatible.",
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
    descDe: "Zeigt integrierte Lautheit in LUFS. Grüner Bereich = Streaming-konform. Rot = zu laut, wird von Plattformen automatisch gedämpft.",
    descEn: "Shows integrated loudness in LUFS. Green zone = streaming-compliant. Red = too loud, platforms auto-duck it.",
    visual: <MiniLUFSMeter />,
  },
  {
    key: "spectrogram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="14" height="14" rx="2" fill="rgba(0,229,196,0.1)" stroke="currentColor" strokeWidth="1" opacity=".5"/>
        <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" opacity=".8"/>
        <rect x="9" y="3" width="4" height="4" rx="1" fill="currentColor" opacity=".4"/>
        <rect x="3" y="9" width="4" height="4" rx="1" fill="currentColor" opacity=".3"/>
        <rect x="9" y="9" width="4" height="4" rx="1" fill="currentColor" opacity=".6"/>
      </svg>
    ),
    color: "#a855f7",
    titleDe: "Spectrogram Waterfall",   titleEn: "Spectrogram Waterfall",
    descDe: "X = Frequenz, Y = Zeit, Farbe = Intensität. Zeigt, wann welche Frequenzen aktiv sind — ideal für Transienten-Analyse.",
    descEn: "X = frequency, Y = time, colour = intensity. Shows when each frequency is active — ideal for transient analysis.",
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
        qDe: "Wie funktioniert UpMaDo?",
        qEn: "How does UpMaDo work?",
        aDe: "Lade eine WAV- oder MP3-Datei hoch, wähle Zielplattform und Genre-Preset, stelle die Mastering-Intensität ein und klicke auf Mastern (oder drücke M). Die KI analysiert dein Audio, wählt automatisch die optimalen Parameter und die 12-stufige DSP-Pipeline verarbeitet deinen Track professionell.",
        aEn: "Upload a WAV or MP3 file, choose your target platform and genre preset, set the mastering intensity, and click Master (or press M). The AI analyses your audio, automatically selects optimal parameters, and the 12-stage DSP pipeline processes your track professionally.",
      },
      {
        qDe: "Welche Dateiformate werden unterstützt?",
        qEn: "Which file formats are supported?",
        aDe: "Upload: WAV (alle Bit-Tiefen), MP3, FLAC, AIFF. Download: WAV 32-bit Float, WAV 24-bit, WAV 16-bit (mit Dither), FLAC 24-bit, MP3 320 kbps, MP3 128 kbps, AAC 256 kbps.",
        aEn: "Upload: WAV (all bit depths), MP3, FLAC, AIFF. Download: WAV 32-bit Float, WAV 24-bit, WAV 16-bit (with dither), FLAC 24-bit, MP3 320 kbps, MP3 128 kbps, AAC 256 kbps.",
      },
      {
        qDe: "Wie lange dauert das Mastering?",
        qEn: "How long does mastering take?",
        aDe: "Die Analyse dauert ca. 5–10 Sekunden. Das vollständige Mastering (DSP-Pipeline + alle Exportformate) dauert je nach Tracklänge 30 Sekunden bis 3 Minuten. Der Fortschritt wird in Echtzeit angezeigt.",
        aEn: "Analysis takes approx. 5–10 seconds. Full mastering (DSP pipeline + all export formats) takes 30 seconds to 3 minutes depending on track length. Progress is shown in real time.",
      },
      {
        qDe: "Ist UpMaDo wirklich komplett kostenlos?",
        qEn: "Is UpMaDo really completely free?",
        aDe: "Ja. Alle Funktionen — Auto AI, Referenz-Track-Mastering, alle Export-Formate inkl. WAV 32-bit — sind kostenlos und ohne Abo nutzbar. Ein faires Tageslimit pro Account schützt lediglich vor Serverüberlastung.",
        aEn: "Yes. All features — Auto AI, reference-track mastering, all export formats including WAV 32-bit — are free and require no subscription. A fair daily limit per account simply protects against server overload.",
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
        qDe: "Was ist der Mastering Intensity Slider?",
        qEn: "What is the Mastering Intensity Slider?",
        aDe: "Der Intensity-Slider (0–100%) steuert, wie stark die Bearbeitung ist. 0% = fast kein Eingriff, 100% = maximales Processing (volle Kompression, starke EQ-Korrekturen, volle Sättigung). 65% ist der empfohlene Ausgangswert für die meisten Tracks.",
        aEn: "The intensity slider (0–100%) controls how strongly the processing is applied. 0% = almost no processing, 100% = maximum (full compression, strong EQ, full saturation). 65% is the recommended starting point for most tracks.",
      },
      {
        qDe: "Was bedeuten die Plattform-Presets?",
        qEn: "What do the platform presets mean?",
        aDe: "Spotify: –14 LUFS, Apple Music: –16 LUFS, YouTube: –14 LUFS, Club/DJ: –9 LUFS (sehr laut), Custom: frei einstellbar. Der True Peak Ceiling liegt immer bei –1 dBTP.",
        aEn: "Spotify: –14 LUFS, Apple Music: –16 LUFS, YouTube: –14 LUFS, Club/DJ: –9 LUFS (very loud), Custom: freely adjustable. True Peak Ceiling is always –1 dBTP.",
      },
      {
        qDe: "Was ist Reference Mastering?",
        qEn: "What is Reference Mastering?",
        aDe: "Lade einen professionellen Track als Klang-Referenz hoch. Die Analyse erfasst dessen Spektralbalance, Loudness, Dynamik und Stereobreite und passt dein Mastering entsprechend an — ähnlich wie in professionellen Studios. Kostenlos für alle nutzbar.",
        aEn: "Upload a professional track as a sound reference. The analysis captures its spectral balance, loudness, dynamics, and stereo width and adapts your mastering accordingly — similar to professional studios. Free for everyone.",
      },
      {
        qDe: "Was ist M/S Processing?",
        qEn: "What is M/S Processing?",
        aDe: "Mid/Side-Processing trennt das Stereo-Signal in Mitte (Mid = L+R) und Seite (Side = L–R). Dies ermöglicht unabhängige Bearbeitung von Breite und Tiefe. UpMaDo entfernt außerdem automatisch tiefe Frequenzen unter 120 Hz aus dem Seitenkanal für bessere Club-Kompatibilität.",
        aEn: "Mid/Side processing splits the stereo signal into centre (Mid = L+R) and side (Side = L–R). This allows independent processing of width and depth. UpMaDo also automatically removes low frequencies below 120 Hz from the side channel for better club compatibility.",
      },
      {
        qDe: "Was bedeutet Mono-Kompatibilität?",
        qEn: "What does mono compatibility mean?",
        aDe: "Mono-Kompatibilität bedeutet, dass dein Track auch in Mono gut klingt — wichtig für Club-Systeme, Telefone und kleine Lautsprecher. Das Stereofeld-Vektorskop zeigt einen positiven Korrelationswert, wenn dein Track mono-kompatibel ist. UpMaDo zeigt dir dies direkt in der Analyse.",
        aEn: "Mono compatibility means your track sounds good in mono too — important for club systems, phones, and small speakers. The stereo field vectorscope shows a positive correlation value when your track is mono-compatible. UpMaDo shows this directly in the analysis.",
      },
    ],
  },
  {
    id: "analysis",
    color: "#f59e0b",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 9l2-2 2 2 2-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    titleDe: "Analyse & Visualizer", titleEn: "Analysis & Visualizers",
    items: [
      {
        qDe: "Was zeigt der A/B-Player?",
        qEn: "What does the A/B player show?",
        aDe: "A = dein Original-Upload, B = der fertige Master. Wechsle jederzeit zwischen beiden — der Player pausiert nicht. Alle Visualisierungen (Spektrum, Wellenform, Stereofeld, LUFS, Spectrogram) reagieren in Echtzeit auf die aktuelle Wiedergabe.",
        aEn: "A = your original upload, B = the finished master. Switch between them at any time — the player doesn't pause. All visualisations (spectrum, waveform, stereo field, LUFS, spectrogram) react in real time to the current playback.",
      },
      {
        qDe: "Was sind die roten Marker in der Wellenform?",
        qEn: "What are the red markers in the waveform?",
        aDe: "Rote Balken zeigen Stellen im Audio, wo der Peak-Pegel über 0.98 (–0.17 dBFS) liegt — mögliche Clipping-Zonen im Original. Im gemasterten Audio sollten diese durch den True Peak Limiter verschwunden sein.",
        aEn: "Red bars show places in the audio where the peak level exceeds 0.98 (–0.17 dBFS) — potential clipping zones in the original. In the mastered audio these should be gone thanks to the True Peak Limiter.",
      },
      {
        qDe: "Was ist der Spectrogram Waterfall?",
        qEn: "What is the Spectrogram Waterfall?",
        aDe: "X-Achse = Frequenz (20 Hz–20 kHz), Y-Achse = Zeit, Farbe = Lautstärke (schwarz = leise, weiß = laut). So erkennst du, wann welche Frequenzen aktiv sind — ideal für Transienten und Arrangement-Analyse.",
        aEn: "X-axis = frequency (20 Hz–20 kHz), Y-axis = time, colour = loudness (black = quiet, white = loud). This shows when each frequency is active — ideal for transient and arrangement analysis.",
      },
      {
        qDe: "Was ist LUFS?",
        qEn: "What is LUFS?",
        aDe: "LUFS (Loudness Units Full Scale) ist der Standard zur Lautstärkemessung für Streaming-Plattformen. Spotify normalisiert auf –14 LUFS — lautere Tracks werden automatisch leiser gedreht. Mit UpMaDo wird dein Track exakt auf den richtigen LUFS-Wert normalisiert.",
        aEn: "LUFS (Loudness Units Full Scale) is the standard loudness measurement for streaming platforms. Spotify normalises to –14 LUFS — louder tracks are auto-ducked. UpMaDo normalises your track to exactly the right LUFS value.",
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
        qDe: "Werden meine Audiodateien gespeichert?",
        qEn: "Are my audio files stored?",
        aDe: "Nein. Hochgeladene Original-Audiodateien werden sofort nach Abschluss der Verarbeitung vom Server gelöscht (max. 60 Minuten). Gemasterte Ausgabedateien werden 24 Stunden vorgehalten und dann automatisch gelöscht. Keine dauerhafte Speicherung, keine Weitergabe.",
        aEn: "No. Uploaded original audio files are deleted immediately after processing is complete (max. 60 minutes). Mastered output files are kept for 24 hours and then automatically deleted. No permanent storage, no sharing.",
      },
      {
        qDe: "Welche Browser werden unterstützt?",
        qEn: "Which browsers are supported?",
        aDe: "Alle modernen Browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Für die Audio-Visualisierungen wird die Web Audio API benötigt — diese ist in allen genannten Browsern verfügbar.",
        aEn: "All modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. The Web Audio API is required for audio visualisations — available in all listed browsers.",
      },
      {
        qDe: "Was ist der Tastaturkürzel M?",
        qEn: "What is the keyboard shortcut M?",
        aDe: "Drücke M auf der Tastatur, um das Mastering zu starten — genauso wie der Mastern-Button. Praktisch wenn du mehrere Tracks nacheinander masterst. Die Leertaste startet/stoppt die Wiedergabe.",
        aEn: "Press M on the keyboard to start mastering — same as the Master button. Useful when mastering multiple tracks in sequence. Space bar starts/stops playback.",
      },
      {
        qDe: "Wie maistere ich mehrere Tracks?",
        qEn: "How do I master multiple tracks?",
        aDe: "Wähle deinen Track, stelle Parameter ein, drücke M — warte auf den Download. Dann lade den nächsten Track hoch und wiederhole. Der Mastering-Verlauf speichert Metadaten aller deiner Masterings (Dateiname, LUFS-Werte, Parameter) — die Audiodateien selbst können nur innerhalb des 24-Stunden-Download-Fensters heruntergeladen werden.",
        aEn: "Select your track, set parameters, press M — wait for the download. Then upload the next track and repeat. Mastering history stores metadata for all your masters (file name, LUFS values, parameters) — the actual audio files can only be downloaded within the 24-hour download window.",
      },
      {
        qDe: "Wie lange habe ich Zeit zum Download?",
        qEn: "How long do I have to download?",
        aDe: "Gemasterte Dateien stehen 24 Stunden nach Fertigstellung zum Download bereit. Nach Ablauf werden alle Dateien automatisch und unwiederbringlich gelöscht — also rechtzeitig herunterladen!",
        aEn: "Mastered files are available for download for 24 hours after completion. After expiry, all files are automatically and permanently deleted — make sure to download in time!",
      },
      {
        qDe: "Ist Auto AI kostenlos nutzbar?",
        qEn: "Is Auto AI free to use?",
        aDe: "Ja. Auto AI analysiert dein Audio (Genre, Dynamik, Spektralbalance) und wählt automatisch passende Mastering-Parameter — komplett kostenlos und ohne Limit über das faire Tageslimit hinaus.",
        aEn: "Yes. Auto AI analyzes your audio (genre, dynamics, spectral balance) and automatically selects matching mastering parameters — completely free with no limit beyond the fair daily usage cap.",
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
        border: `1px solid ${open ? color.replace(")", ", 0.3)").replace("var(", "rgba(").replace("--accent-cyan", "0,229,196").replace("--accent-purple", "124,111,255") || "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)"}`,
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
export default function HelpPage() {
  const [lang, setLang] = useState<Lang>("de");
  const [search, setSearch] = useState("");

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
      <Header />

      {/* ── Language Toggle ── */}
      <div style={{ position: "fixed", top: 80, right: 16, zIndex: 40 }}>
        <div style={{
          display: "flex", borderRadius: 8, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
        }}>
          {(["de","en"] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: "5px 12px", border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: lang === l ? "rgba(124,111,255,0.25)" : "transparent",
              color: lang === l ? "var(--accent-purple)" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "7rem 2rem 3rem" }}>
        <div style={{
          display: "inline-block", background: "rgba(0,229,196,0.1)",
          border: "1px solid rgba(0,229,196,0.25)", borderRadius: 6,
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
                const colors = ["var(--accent-cyan)", "var(--accent-purple)", "var(--accent-gold)", "#06b6d4"];
                return (
                  <div key={i} style={{
                    background: "var(--bg-secondary)",
                    border: `1px solid ${colors[i].replace("var(--accent-cyan)","rgba(0,229,196,0.2)").replace("var(--accent-purple)","rgba(124,111,255,0.2)").replace("var(--accent-gold)","rgba(245,200,66,0.2)").replace("#06b6d4","rgba(6,182,212,0.2)")}`,
                    borderRadius: 14, padding: "1.25rem",
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
                    position: "relative",
                  }}>
                    <div style={{
                      fontSize: "1.8rem", fontWeight: 900, lineHeight: 1,
                      color: colors[i].replace("var(--accent-cyan)","rgba(0,229,196,0.15)").replace("var(--accent-purple)","rgba(124,111,255,0.15)").replace("var(--accent-gold)","rgba(245,200,66,0.15)").replace("#06b6d4","rgba(6,182,212,0.15)"),
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
              border: "1px solid rgba(245,200,66,0.15)",
              borderRadius: 16, padding: "1.75rem 2rem",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                {T.kbd_keys[lang].map((k) => (
                  <div key={k.key} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <KbdKey k={k.key} wide={k.key === "Space"} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="rgba(245,200,66,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
          border: "1px solid rgba(124,111,255,0.2)",
          borderRadius: 16, padding: "2rem",
          textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(124,111,255,0.12)",
            border: "1px solid rgba(124,111,255,0.3)",
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

      <Footer />
      <ScrollToTop />

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
