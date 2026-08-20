"use client";

import { useState, type CSSProperties } from "react";
import { Activity, ArrowRight, FileCheck2, Gauge, ScanLine, Sparkles, Waves } from "lucide-react";

type Lang = "de" | "en";
type CompareMode = "before" | "after";

const T = {
  badge: { de: "Interaktiver Klangvergleich", en: "Interactive sound comparison" },
  heading: { de: "Dein Track – vorher & nachher", en: "Your track – before & after" },
  sub: {
    de: "Wechsle zwischen Original und Master und sieh, wie sich Lautheit, Dynamik und Frequenzbalance verändern.",
    en: "Switch between the original and master to see how loudness, dynamics and frequency balance change.",
  },
  before: { de: "Vorher", en: "Before" },
  after: { de: "Nachher", en: "After" },
  original: { de: "Original-Mix", en: "Original mix" },
  mastered: { de: "Adaptiver Master", en: "Adaptive master" },
  example: { de: "Visualisierte Beispielwerte", en: "Illustrative example values" },
  monitor: { de: "A/B-KLANGVERGLEICH", en: "A/B MASTERING MONITOR" },
  originalSignal: { de: "ORIGINAL-SIGNAL", en: "ORIGINAL SIGNAL" },
  masteredSignal: { de: "MASTER-SIGNAL", en: "MASTERED SIGNAL" },
  loudness: { de: "Lautheit", en: "Loudness" },
  dynamics: { de: "Dynamik", en: "Dynamics" },
  groupLabel: { de: "Vorher-Nachher-Ansicht", en: "Before-and-after view" },
  loudnessLabel: { de: "Lautheit", en: "Loudness" },
  rangeLabel: { de: "Dynamikumfang", en: "Dynamic range" },
  proof: [
    { title: { de: "Ausgabedatei gemessen", en: "Delivery file measured" }, text: { de: "Nachher-Werte stammen aus dem finalen Export – bei MP3/AAC nach dem Codec.", en: "After values come from the final export, including after MP3/AAC encoding." }, icon: FileCheck2 },
    { title: { de: "A/B direkt im Ergebnis", en: "A/B in your result" }, text: { de: "Original und Master lassen sich im Player ohne Seitenwechsel vergleichen.", en: "Compare the original and master directly in the result player." }, icon: ScanLine },
  ],
};

const METRICS = [
  { label: { de: "Lautheit", en: "Loudness" }, before: "−14.2", after: "−9.0", unit: "LUFS", icon: Gauge },
  { label: { de: "Dynamik", en: "Dynamics" }, before: "8.1", after: "10.8", unit: "DR", icon: Activity },
  { label: { de: "Frequenzbereich", en: "Frequency range" }, before: "18 kHz", after: "20 kHz", unit: "", icon: Waves },
] as const;

const WAVE_BARS = Array.from({ length: 76 }, (_, index) => {
  const envelope = Math.sin((index / 75) * Math.PI);
  const detail = 0.48 + Math.abs(Math.sin(index * 1.73)) * 0.34 + Math.abs(Math.cos(index * 0.47)) * 0.18;
  return Math.max(8, Math.round(envelope * detail * 94));
});

const DYNAMICS_BARS = Array.from({ length: 22 }, (_, index) => 22 + Math.round(Math.abs(Math.sin(index * 0.82 + 0.6)) * 56));

export default function BeforeAfterShowcase({ lang = "de" }: { lang?: Lang }) {
  const [mode, setMode] = useState<CompareMode>("after");
  const isAfter = mode === "after";

  return (
    <section id="before-after" className="compare-section py-20 px-4">
      <div className="compare-wrap max-w-6xl mx-auto">
        <div className="compare-heading text-center">
          <div className="compare-badge"><Sparkles size={13} /> {T.badge[lang]}</div>
          <h2>{T.heading[lang]}</h2>
          <p>{T.sub[lang]}</p>
        </div>

        <div className={`compare-console ${isAfter ? "show-after" : "show-before"}`}>
          <div className="compare-console-top">
            <div>
              <span className="compare-overline">{T.monitor[lang]}</span>
              <h3 aria-live="polite">{isAfter ? T.mastered[lang] : T.original[lang]}</h3>
            </div>
            <div className="compare-toggle" role="group" aria-label={T.groupLabel[lang]}>
              <button type="button" className={!isAfter ? "active" : ""} aria-pressed={!isAfter} onClick={() => setMode("before")}>
                <i /> A&nbsp; {T.before[lang]}
              </button>
              <button type="button" className={isAfter ? "active" : ""} aria-pressed={isAfter} onClick={() => setMode("after")}>
                <i /> B&nbsp; {T.after[lang]}
              </button>
            </div>
          </div>

          <div className="compare-wave-stage">
            <div className="wave-stage-grid" aria-hidden="true" />
            <div className="wave-axis"><span>0:00</span><span>0:45</span><span>1:30</span><span>2:15</span><span>3:00</span><span>3:24</span></div>
            <div className="compare-waveform" aria-hidden="true">
              {WAVE_BARS.map((height, index) => (
                <i
                  key={index}
                  style={{
                    "--wave-height": `${isAfter ? Math.min(100, height * 1.18) : height * 0.76}%`,
                    "--wave-delay": `${index * -18}ms`,
                  } as CSSProperties}
                />
              ))}
            </div>
            <div className="compare-playhead" aria-hidden="true" />
            <div className="wave-state-label"><span>{isAfter ? T.masteredSignal[lang] : T.originalSignal[lang]}</span><i /></div>
          </div>

          <div className="compare-lower-grid">
            <div className="compare-meter-card">
              <div className="compare-card-title"><span>{T.loudness[lang]}</span><i>LUFS</i></div>
              <div className="compare-loudness" aria-label={`${T.loudnessLabel[lang]} ${isAfter ? "−9" : lang === "de" ? "−14,2" : "−14.2"} LUFS`}>
                {["M", "S", "I"].map((label, index) => (
                  <div className="compare-loudness-channel" key={label}>
                    <span>{label}</span>
                    <div><i style={{ "--meter-level": `${(isAfter ? 72 : 54) - index * 3}%` } as CSSProperties} /></div>
                  </div>
                ))}
                <div className="compare-peak"><span>TRUE PEAK</span><strong>{isAfter ? "−1.0" : "−2.4"}</strong><small>dBTP</small></div>
              </div>
            </div>
            <div className="compare-meter-card">
              <div className="compare-card-title"><span>{T.dynamics[lang]}</span><i>DR</i></div>
              <div className="compare-dynamics" aria-label={`${T.rangeLabel[lang]} ${isAfter ? (lang === "de" ? "10,8" : "10.8") : (lang === "de" ? "8,1" : "8.1")}`}>
                <div className="dynamics-bars" aria-hidden="true">
                  {DYNAMICS_BARS.map((height, index) => (
                    <i key={index} style={{ height: `${isAfter ? height : Math.max(14, height * 0.68)}%` }} />
                  ))}
                </div>
                <div className="dynamics-readout"><strong>DR{isAfter ? "11" : "8"}</strong><span>CF {isAfter ? "11.5" : "9.2"} dB</span></div>
              </div>
            </div>
            <div className="compare-metrics">
              {METRICS.map(({ label, before, after, unit, icon: Icon }) => (
                <div className="compare-metric" key={label.de}>
                  <span className="metric-icon"><Icon size={15} /></span>
                  <span><small>{label[lang]}</small><strong>{lang === "de" ? before.replace(".", ",") : before}</strong></span>
                  <ArrowRight size={13} />
                  <span className="metric-result"><strong>{lang === "de" ? after.replace(".", ",") : after}</strong><small>{unit}</small></span>
                </div>
              ))}
              <div className="compare-example-note">{T.example[lang]}</div>
            </div>
          </div>
        </div>

        <div className="compare-proof-strip" aria-label={lang === "de" ? "So prüft Beatzucker das Ergebnis" : "How Beatzucker verifies the result"}>
          {T.proof.map(({ title, text, icon: Icon }) => (
            <div className="compare-proof" key={title.de}>
              <span><Icon size={17} aria-hidden="true" /></span>
              <div><strong>{title[lang]}</strong><small>{text[lang]}</small></div>
            </div>
          ))}
          <a href={lang === "en" ? "/en#mastering" : "/#mastering"}>
            {lang === "de" ? "Eigenen Track analysieren" : "Analyze your own track"} <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
