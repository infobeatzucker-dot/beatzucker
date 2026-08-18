"use client";

import { AnalysisData, type Lang } from "@/lib/types/mastering";
import dynamic from "next/dynamic";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

// Dynamic imports to avoid SSR issues with Canvas
const SpectrumAnalyzer     = dynamic(() => import("./Visualizer/SpectrumAnalyzer"),     { ssr: false });
const LUFSMeter            = dynamic(() => import("./Visualizer/LUFSMeter"),            { ssr: false });
const WaveformViewer       = dynamic(() => import("./Visualizer/WaveformViewer"),       { ssr: false });
const StereoField          = dynamic(() => import("./Visualizer/StereoField"),          { ssr: false });
const DynamicsGraph        = dynamic(() => import("./Visualizer/DynamicsGraph"),        { ssr: false });
const SpectrogramWaterfall = dynamic(() => import("./Visualizer/SpectrogramWaterfall"), { ssr: false });

interface Props {
  preAnalysis:  AnalysisData;
  postAnalysis: AnalysisData | null;
  isProcessing: boolean;
  lang?: Lang;
}

function StatRow({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="mono text-xs font-medium" style={{ color: color || "var(--accent-cyan)" }}>
        {value}{unit && <span style={{ color: "var(--text-muted)" }}> {unit}</span>}
      </span>
    </div>
  );
}

function CompareValue({ label, pre, post, unit, higherIsBetter = true }: {
  label: string; pre: number; post: number | null; unit?: string; higherIsBetter?: boolean;
}) {
  const improved = post !== null && (higherIsBetter ? post > pre : post < pre);
  return (
    <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>
          {pre.toFixed(1)}{unit}
        </span>
        {post !== null && (
          <>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span className="mono text-xs font-medium" style={{ color: improved ? "var(--accent-cyan)" : "var(--accent-purple)" }}>
              {post.toFixed(1)}{unit}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function MonoCompatRow({ pre, post, lang }: { pre: number; post: number | null; lang: Lang }) {
  const val = post ?? pre;
  const color = val >= 0.7 ? "var(--accent-cyan)" : val >= 0.5 ? "var(--accent-gold)" : "var(--accent-red)";
  const label = lang === "de" ? (val >= 0.7 ? "Gut" : val >= 0.5 ? "Grenzwertig" : "Schwach") : (val >= 0.7 ? "Good" : val >= 0.5 ? "Marginal" : "Poor");
  return (
    <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lang === "de" ? "Mono-Kompatibilität" : "Mono compatibility"}</span>
      <div className="flex items-center gap-2">
        {post !== null && (
          <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>
            {pre.toFixed(2)}
          </span>
        )}
        {post !== null && <span style={{ color: "var(--text-muted)" }}>→</span>}
        <span className="mono text-xs font-bold" style={{ color }}>
          {(post ?? pre).toFixed(2)}
        </span>
        <span className="text-[9px] px-1 py-0.5 rounded font-bold"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
          {label}
        </span>
      </div>
    </div>
  );
}

export default function AnalysisPanel({ preAnalysis, postAnalysis, isProcessing, lang = "de" }: Props) {
  // Grab live analyser nodes from the audio engine (null if engine not yet initialized)
  const engine = useAudioEngine();
  const analyserMono = engine?.analyserMono ?? null;
  const analyserL    = engine?.analyserL    ?? null;
  const analyserR    = engine?.analyserR    ?? null;

  return (
    <div className="analysis-panel mb-6">
      <div className="analysis-section-heading">
        <div>
          <span>{lang === "de" ? "LIVE-AUDIOANALYSE" : "LIVE AUDIO INTELLIGENCE"}</span>
          <h3>{lang === "de" ? "Track-Analyse" : "Track analysis"}</h3>
        </div>
        <div className={`analysis-live-status ${isProcessing ? "processing" : ""}`}><i /> {isProcessing ? (lang === "de" ? "Analyse läuft" : "Analyzing") : "Live"}</div>
      </div>
      {/* Main visualizers grid */}
      <div className="visualizer-grid grid md:grid-cols-3 gap-4 mb-4">
        {/* Spectrum Analyzer */}
        <div className="analyzer-card glass-panel p-3" style={{ height: 220 }}>
          <div className="analyzer-card-title"><span>{lang === "de" ? "Frequenzspektrum" : "Spectrum analyzer"}</span><i>FFT</i></div>
          <SpectrumAnalyzer
            isProcessing={isProcessing}
            hasPostData={postAnalysis !== null}
            analyser={analyserMono}
          />
        </div>

        {/* Waveform Viewer */}
        <div className="analyzer-card featured glass-panel p-3" style={{ height: 220 }}>
          <div className="analyzer-card-title"><span>{lang === "de" ? "Wellenform" : "Waveform"}</span><i>{lang === "de" ? "ZEIT" : "TIME"}</i></div>
          <WaveformViewer
            isProcessing={isProcessing}
            hasPostData={postAnalysis !== null}
            analyser={analyserMono}
          />
        </div>

        {/* Spectrogram Waterfall */}
        <div className="analyzer-card glass-panel p-3" style={{ height: 220 }}>
          <div className="analyzer-card-title"><span>Spectrogram</span><i>HZ</i></div>
          <SpectrogramWaterfall
            analyser={analyserMono}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      <div className="visualizer-grid grid md:grid-cols-3 gap-4 mb-4">
        {/* LUFS Meter */}
        <div className="analyzer-card glass-panel p-3" style={{ height: 190 }}>
          <div className="analyzer-card-title"><span>LUFS / True Peak</span><i>DB</i></div>
          <LUFSMeter
            integrated={preAnalysis.integrated_lufs}
            truePeak={preAnalysis.true_peak}
            isProcessing={isProcessing}
            analyser={analyserMono}
          />
        </div>

        {/* Stereo Field */}
        <div className="analyzer-card glass-panel p-3" style={{ height: 190 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="analyzer-card-title"><span>{lang === "de" ? "Stereofeld" : "Stereo field"}</span><i>M/S</i></span>
            {/* Mono compatibility badge */}
            {(() => {
              const mc = postAnalysis?.mono_compatibility ?? preAnalysis.mono_compatibility;
              const isBad  = mc < 0.5;
              const isWarn = mc >= 0.5 && mc < 0.7;
              if (!isBad && !isWarn) return null;
              return (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: isBad ? "rgba(255,71,87,0.15)" : "rgba(196,181,253,0.15)",
                    border:     isBad ? "1px solid rgba(255,71,87,0.4)" : "1px solid rgba(196,181,253,0.4)",
                    color:      isBad ? "var(--accent-red)" : "var(--accent-gold)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {lang === "de" ? (isBad ? "⚠ PHASENFEHLER" : "⚠ MONO-WARNUNG") : (isBad ? "⚠ PHASE ISSUES" : "⚠ MONO WARNING")}
                </span>
              );
            })()}
          </div>
          <StereoField
            stereoWidth={preAnalysis.stereo_width}
            monoCompatibility={preAnalysis.mono_compatibility}
            isProcessing={isProcessing}
            analyserL={analyserL}
            analyserR={analyserR}
          />
        </div>

        {/* Dynamics Graph */}
        <div className="analyzer-card glass-panel p-3" style={{ height: 190 }}>
          <div className="analyzer-card-title"><span>{lang === "de" ? "Dynamik" : "Dynamics"}</span><i>DR</i></div>
          <DynamicsGraph
            drValue={preAnalysis.dr_value}
            crestFactor={preAnalysis.crest_factor}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="analysis-stats-grid grid md:grid-cols-3 gap-4">
        {/* Loudness */}
        <div className="analysis-stat-card glass-panel p-4">
          <div className="label mb-3">{lang === "de" ? "Lautheit" : "Loudness"}</div>
          <CompareValue label={lang === "de" ? "Integriert" : "Integrated"} pre={preAnalysis.integrated_lufs} post={postAnalysis?.integrated_lufs ?? null} unit=" LUFS" higherIsBetter={true} />
          <CompareValue label="True Peak"  pre={preAnalysis.true_peak}       post={postAnalysis?.true_peak ?? null}       unit=" dBTP" higherIsBetter={false} />
          <StatRow label={lang === "de" ? "Dynamikumfang" : "Dynamic range"} value={preAnalysis.dr_value.toFixed(0)} unit="DR" />
          <StatRow label={lang === "de" ? "Scheitelfaktor" : "Crest factor"} value={preAnalysis.crest_factor.toFixed(1)} unit="dB" />
          <MonoCompatRow pre={preAnalysis.mono_compatibility} post={postAnalysis?.mono_compatibility ?? null} lang={lang} />
        </div>

        {/* Spectral */}
        <div className="analysis-stat-card glass-panel p-4">
          <div className="label mb-3">{lang === "de" ? "Spektralwerte" : "Spectral"}</div>
          <StatRow label={lang === "de" ? "Schwerpunkt" : "Centroid"} value={(preAnalysis.spectral_centroid / 1000).toFixed(1)} unit="kHz" />
          <StatRow label="Rolloff"  value={(preAnalysis.spectral_rolloff  / 1000).toFixed(1)} unit="kHz" />
          <StatRow label={lang === "de" ? "Flachheit" : "Flatness"} value={(preAnalysis.spectral_flatness * 100).toFixed(1)} unit="%" />
          <StatRow
            label={lang === "de" ? "Übersteuerung" : "Clipping"}
            value={preAnalysis.clipping_detected ? (lang === "de" ? "Erkannt" : "Detected") : (lang === "de" ? "Keine" : "None")}
            color={preAnalysis.clipping_detected ? "var(--accent-red)" : "var(--accent-cyan)"}
          />
        </div>

        {/* Track Info */}
        <div className="analysis-stat-card glass-panel p-4">
          <div className="label mb-3">{lang === "de" ? "Track-Informationen" : "Track info"}</div>
          <StatRow label="BPM"         value={preAnalysis.bpm.toFixed(0)} />
          <StatRow label={lang === "de" ? "Tonart" : "Key"} value={preAnalysis.key} />
          <StatRow label={lang === "de" ? "Abtastrate" : "Sample rate"} value={(preAnalysis.sample_rate / 1000).toFixed(1)} unit="kHz" />
          <StatRow label={lang === "de" ? "Kanäle" : "Channels"} value={preAnalysis.channels === 2 ? "Stereo" : "Mono"} />
        </div>
      </div>

      {/* Mono compatibility warning banner — shown when source has phase issues */}
      {preAnalysis.mono_compatibility < 0.7 && (
        <div
          className="rounded-xl p-3 mt-4 flex items-start gap-2.5"
          style={{
            background: preAnalysis.mono_compatibility < 0.5
              ? "rgba(255,71,87,0.07)"
              : "rgba(196,181,253,0.07)",
            border: preAnalysis.mono_compatibility < 0.5
              ? "1px solid rgba(255,71,87,0.3)"
              : "1px solid rgba(196,181,253,0.3)",
          }}
        >
          <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24"
            fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            stroke={preAnalysis.mono_compatibility < 0.5 ? "var(--accent-red)" : "var(--accent-gold)"}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div className="text-xs font-semibold mb-0.5"
              style={{ color: preAnalysis.mono_compatibility < 0.5 ? "var(--accent-red)" : "var(--accent-gold)" }}>
              {lang === "de" ? (preAnalysis.mono_compatibility < 0.5 ? "Phasenproblem erkannt" : "Mono-Kompatibilität niedrig") : (preAnalysis.mono_compatibility < 0.5 ? "Phase issue detected" : "Low mono compatibility")}
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {lang === "de"
                ? (preAnalysis.mono_compatibility < 0.5
                  ? `Mono-Kompatibilität: ${preAnalysis.mono_compatibility.toFixed(2)} — starke Phasenauslöschung möglich. Mastering fügt automatisch einen Subbass-Monofilter (< 120 Hz) hinzu.`
                  : `Mono-Kompatibilität: ${preAnalysis.mono_compatibility.toFixed(2)} — auf Mono-Geräten klingen Bässe eventuell dünner. Der Subbass wird beim Mastering automatisch mono gestellt.`)
                : (preAnalysis.mono_compatibility < 0.5
                  ? `Mono compatibility: ${preAnalysis.mono_compatibility.toFixed(2)} — strong phase cancellation is possible. Mastering automatically adds a sub-bass mono filter below 120 Hz.`
                  : `Mono compatibility: ${preAnalysis.mono_compatibility.toFixed(2)} — bass may sound thinner on mono devices. Sub-bass is automatically made mono during mastering.`)
              }
            </div>
          </div>
        </div>
      )}

      {/* Frequency bands */}
      <div className="frequency-energy-card glass-panel p-4 mt-4">
        <div className="label mb-3">{lang === "de" ? "Frequenzband-Energie" : "Frequency band energy"}</div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Sub",  value: preAnalysis.rms_sub,  post: postAnalysis?.rms_sub,  cls: "freq-sub"  },
            { label: lang === "de" ? "Bass" : "Low", value: preAnalysis.rms_low, post: postAnalysis?.rms_low, cls: "freq-low" },
            { label: lang === "de" ? "Mitten" : "Mid", value: preAnalysis.rms_mid, post: postAnalysis?.rms_mid, cls: "freq-mid" },
            { label: lang === "de" ? "Höhen" : "High", value: preAnalysis.rms_high, post: postAnalysis?.rms_high, cls: "freq-high" },
            { label: lang === "de" ? "Brillanz" : "Air", value: preAnalysis.rms_air, post: postAnalysis?.rms_air, cls: "freq-air" },
          ].map((band) => (
            <div key={band.label} className="text-center">
              <div className={`label mb-1 ${band.cls}`}>{band.label}</div>
              <div className="mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {band.value.toFixed(1)}
              </div>
              {band.post !== undefined && (
                <div className="mono text-xs" style={{ color: "var(--accent-cyan)" }}>
                  → {band.post.toFixed(1)}
                </div>
              )}
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>dB</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
