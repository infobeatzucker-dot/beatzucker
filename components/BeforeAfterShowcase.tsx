"use client";

import WaveformViewer from "@/components/Visualizer/WaveformViewer";
import LUFSMeter from "@/components/Visualizer/LUFSMeter";
import DynamicsGraph from "@/components/Visualizer/DynamicsGraph";

type Lang = "de" | "en";

const T = {
  badge:   { de: "Beispielhafte Darstellung", en: "Illustrative example" },
  heading: { de: "Der Unterschied ist hörbar", en: "The difference is audible" },
  sub: {
    de: "So verändern sich Lautheit und Dynamik durch das Mastering — Beispielwerte, kein echter Track.",
    en: "How loudness and dynamics change through mastering — example values, not a real track.",
  },
  loudness: { de: "Lautheit", en: "Loudness" },
  dynamics: { de: "Dynamik", en: "Dynamics" },
  before: { de: "Vorher", en: "Before" },
  after:  { de: "Nachher", en: "After" },
};

export default function BeforeAfterShowcase({ lang = "de" }: { lang?: Lang }) {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div
            className="inline-block px-3 py-1 rounded-full mb-3"
            style={{
              fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--accent-cyan)", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            {T.badge[lang]}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
            {T.heading[lang]}
          </h2>
          <p className="text-sm md:text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            {T.sub[lang]}
          </p>
        </div>

        <div className="glass-panel-elevated p-6 md:p-8">
          <div className="flex items-center gap-4 mb-4 justify-center">
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent-purple)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-purple)", display: "inline-block" }} />
              {T.before[lang]}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent-cyan)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-cyan)", display: "inline-block" }} />
              {T.after[lang]}
            </span>
          </div>

          <div className="glass-panel p-3 mb-5" style={{ height: 180 }}>
            <WaveformViewer isProcessing={false} hasPostData analyser={null} />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-panel p-3" style={{ height: 160 }}>
              <div className="label mb-2">{T.loudness[lang]}</div>
              <LUFSMeter integrated={-9.0} truePeak={-1.0} isProcessing={false} analyser={null} />
            </div>
            <div className="glass-panel p-3" style={{ height: 160 }}>
              <div className="label mb-2">{T.dynamics[lang]}</div>
              <DynamicsGraph drValue={10.8} crestFactor={11.5} isProcessing={false} />
            </div>
            <div className="glass-panel p-3 flex flex-col justify-center gap-3" style={{ height: 160 }}>
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{T.loudness[lang]}</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  <span style={{ color: "var(--accent-purple)" }}>-14.2</span> → <span style={{ color: "var(--accent-cyan)" }}>-9.0 LUFS</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{T.dynamics[lang]}</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  <span style={{ color: "var(--accent-purple)" }}>8.1</span> → <span style={{ color: "var(--accent-cyan)" }}>10.8 DR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
