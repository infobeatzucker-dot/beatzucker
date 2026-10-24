"use client";

import { Brain, Settings2, Package, type LucideIcon } from "lucide-react";
import ManualMasteringExplainer from "@/components/ManualMasteringExplainer";
import CurrentMasteringGuide from '@/components/CurrentMasteringGuide';
import { MASTERING_STAGES } from "@/lib/masteringStages";

type Lang = "de" | "en";

interface Props {
  lang?: Lang;
}

const FEATURES: {
  icon: LucideIcon;
  title: { de: string; en: string };
  desc: { de: string; en: string };
  details: { de: string[]; en: string[] };
  color: string;
}[] = [
  {
    icon: Brain,
    title: { de: "Adaptive Audioanalyse", en: "Adaptive Audio Analysis" },
    desc: {
      de: "Die Engine misst Energie, Dynamik, Spektrum und Stereobild deines Tracks und leitet daraus reproduzierbar passende Mastering-Parameter ab.",
      en: "The engine measures energy, dynamics, spectrum and stereo image, then derives reproducible mastering parameters from those measurements.",
    },
    details: {
      de: ["Preset-Adaption", "Spektralanalyse", "Dynamikmessung", "BPM & Tonerkennung"],
      en: ["Preset adaptation", "Spectral analysis", "Dynamic range measurement", "BPM & key detection"],
    },
    color: "var(--accent-purple)",
  },
  {
    icon: Settings2,
    title: { de: "Professionelle Signalkette", en: "A Professional Signal Chain" },
    desc: {
      de: "Eine 12-stufige Kette baut auf Spotifys Pedalboard, pyloudnorm nach ITU-R BS.1770-4 und Multiband-Kompression auf — bewährte Bausteine professioneller Audiobearbeitung.",
      en: "A 12-stage chain built on Spotify's Pedalboard, pyloudnorm (ITU-R BS.1770-4) and multiband compression — proven building blocks for professional audio processing.",
    },
    details: {
      de: ["Korrektur-EQ", "Multiband-Kompression", "M/S-Processing", "True-Peak-Limiting"],
      en: ["Correction EQ", "Multiband compression", "M/S processing", "True Peak limiting"],
    },
    color: "var(--accent-cyan)",
  },
  {
    icon: Package,
    title: { de: "Formate für jeden Zweck", en: "A Format for Every Purpose" },
    desc: {
      de: "Wähle das gewünschte Exportformat pro Durchlauf: zum Beispiel WAV 32-bit Float, MP3 oder verlustfreies FLAC. Eine MP3-Vorschau ergänzt die gewählte Ausgabe.",
      en: "Choose an output format per run, such as WAV 32-bit float, MP3 or lossless FLAC. An MP3 preview accompanies the selected output.",
    },
    details: {
      de: ["WAV 32/24/16 Bit", "FLAC verlustfrei", "MP3 320kbps", "AAC 256kbps"],
      en: ["WAV 32/24/16 bit", "FLAC lossless", "MP3 320kbps", "AAC 256kbps"],
    },
    color: "var(--accent-gold)",
  },
];

const CHAIN_STEPS = { de: MASTERING_STAGES.map(stage => stage.de), en: MASTERING_STAGES.map(stage => stage.en) };

const T = {
  how_it_works: { de: "Ablauf", en: "The Process" },
  headline:     { de: "Studio-Ergebnis ganz ohne Vorbereitung.", en: "Studio results without the studio setup." },
  subtext:      {
    de: "Messbasierte Automatik, Referenzen und Klangcharakter – mit optionaler manueller Feinabstimmung.",
    en: "Measurement-based processing, references and character, with optional manual fine-tuning.",
  },
  mastering_chain: { de: "Die Kette im Überblick", en: "The Chain at a Glance" },
};

export default function FeaturesSection({ lang = "de" }: Props) {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="label mb-3">{T.how_it_works[lang]}</div>
        <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          {T.headline[lang]}
        </h2>
        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          {T.subtext[lang]}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {FEATURES.map((feature) => (
          <div key={feature.title.en} className="glass-panel p-6 hover:border-opacity-50 transition-all">
            <div
              className="mb-4 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `${feature.color}15`,
                border: `1px solid ${feature.color}30`,
              }}
            >
              <feature.icon size={22} strokeWidth={2} color={feature.color} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {feature.title[lang]}
            </h3>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {feature.desc[lang]}
            </p>
            <ul className="space-y-1">
              {feature.details[lang].map((d) => (
                <li key={d} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: feature.color }}>✓</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Processing Steps */}
      <ManualMasteringExplainer lang={lang} />
      <CurrentMasteringGuide lang={lang}/>
      <div className="mt-12 glass-panel p-6">
        <div className="label mb-4 text-center">{T.mastering_chain[lang]}</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {CHAIN_STEPS[lang].map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <span
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ color: "var(--accent-purple)", fontSize: 9 }}>
                  {(i + 1).toString().padStart(2, "0")}
                </span>{" "}
                {step}
              </span>
              {i < CHAIN_STEPS[lang].length - 1 && (
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>›</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
