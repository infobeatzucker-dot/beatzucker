"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, GitCompareArrows, Loader2, UploadCloud } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";

type Slot = { file: File | null; analysis: AnalysisData | null };

export default function ReferenceComparisonTool({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const aRef = useRef<HTMLInputElement>(null), bRef = useRef<HTMLInputElement>(null);
  const [a, setA] = useState<Slot>({ file: null, analysis: null });
  const [b, setB] = useState<Slot>({ file: null, analysis: null });
  const [busy, setBusy] = useState(false), [step, setStep] = useState<0 | 1 | 2>(0), [error, setError] = useState("");

  async function analyze(file: File) {
    const body = new FormData(); body.append("file", file); body.append("purpose", "reference-comparison");
    const response = await fetch("/api/mix-check", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.analysis) throw new Error(payload.error || (en ? "Audio analysis failed." : "Audioanalyse fehlgeschlagen."));
    return payload.analysis as AnalysisData;
  }

  async function run() {
    if (!a.file || !b.file) return;
    setBusy(true); setError(""); setA(slot => ({ ...slot, analysis: null })); setB(slot => ({ ...slot, analysis: null }));
    try {
      setStep(1); const ownAnalysis = await analyze(a.file); setA(slot => ({ ...slot, analysis: ownAnalysis }));
      setStep(2); const referenceAnalysis = await analyze(b.file); setB(slot => ({ ...slot, analysis: referenceAnalysis }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (en ? "Audio analysis failed." : "Audioanalyse fehlgeschlagen."));
    } finally { setBusy(false); setStep(0); }
  }

  const metrics = a.analysis && b.analysis ? [
    { name: "LUFS", a: a.analysis.integrated_lufs, b: b.analysis.integrated_lufs, unit: "LUFS" },
    { name: "True Peak", a: a.analysis.true_peak, b: b.analysis.true_peak, unit: "dBTP" },
    { name: en ? "Dynamics" : "Dynamik", a: a.analysis.dr_value, b: b.analysis.dr_value, unit: "DR" },
    { name: en ? "Stereo width" : "Stereo-Breite", a: a.analysis.stereo_width, b: b.analysis.stereo_width, unit: "×" },
    { name: en ? "Spectral centroid" : "Spektralschwerpunkt", a: a.analysis.spectral_centroid / 1000, b: b.analysis.spectral_centroid / 1000, unit: "kHz" },
    { name: "LRA", a: a.analysis.lra, b: b.analysis.lra, unit: "LU" },
  ] : [];
  const bands = a.analysis && b.analysis ? [
    { n: "Sub", a: a.analysis.rms_sub, b: b.analysis.rms_sub }, { n: "Low", a: a.analysis.rms_low, b: b.analysis.rms_low },
    { n: "Mid", a: a.analysis.rms_mid, b: b.analysis.rms_mid }, { n: "High", a: a.analysis.rms_high, b: b.analysis.rms_high }, { n: "Air", a: a.analysis.rms_air, b: b.analysis.rms_air },
  ] : [];
  const recommendations = a.analysis && b.analysis ? [
    Math.abs(b.analysis.integrated_lufs - a.analysis.integrated_lufs) > 1.5 ? (en ? `Level differs by ${Math.abs(b.analysis.integrated_lufs - a.analysis.integrated_lufs).toFixed(1)} LU. Compare again with loudness-matched playback before changing dynamics.` : `Der Pegel unterscheidet sich um ${Math.abs(b.analysis.integrated_lufs - a.analysis.integrated_lufs).toFixed(1)} LU. Vergleiche vor Dynamikänderungen noch einmal lautheitsangepasst.`) : null,
    Math.abs(b.analysis.spectral_centroid - a.analysis.spectral_centroid) > 650 ? (b.analysis.spectral_centroid > a.analysis.spectral_centroid ? (en ? "The reference has a brighter spectral center. Check presence and air in context instead of copying a fixed EQ curve." : "Die Referenz hat einen helleren Spektralschwerpunkt. Prüfe Präsenz und Air im Kontext, statt eine feste EQ-Kurve zu kopieren.") : (en ? "Your track has a brighter spectral center. Check whether vocals, hats or distortion are driving the difference." : "Dein Track hat einen helleren Spektralschwerpunkt. Prüfe, ob Vocals, Hats oder Verzerrung den Unterschied verursachen.")) : null,
    Math.abs(b.analysis.stereo_width - a.analysis.stereo_width) > .18 ? (en ? "Stereo width differs clearly. Check mono compatibility before widening or narrowing the whole mix." : "Die Stereobreite unterscheidet sich deutlich. Prüfe die Mono-Kompatibilität, bevor du den gesamten Mix verbreiterst oder verengst.") : null,
    a.analysis.true_peak > -1 ? (en ? "Your track has less than 1 dBTP codec headroom. Leave more ceiling before lossy delivery." : "Dein Track hat weniger als 1 dBTP Codec-Headroom. Lass vor verlustbehafteter Auslieferung mehr Reserve.") : null,
  ].filter((item): item is string => Boolean(item)) : [];
  const Upload = ({ slot, set, inputRef, label }: { slot: Slot; set: (slot: Slot) => void; inputRef: React.RefObject<HTMLInputElement | null>; label: string }) =>
    <div className="stem-upload" role="button" tabIndex={0} onClick={() => !busy && inputRef.current?.click()} onKeyDown={event => { if (!busy && (event.key === "Enter" || event.key === " ")) inputRef.current?.click(); }}>
      <div><UploadCloud /></div><span>{label}</span><strong>{slot.file?.name || (en ? "Choose track" : "Track auswählen")}</strong><small>{slot.analysis ? (en ? "Measured" : "Gemessen") : "WAV · FLAC · MP3 · AIFF"}</small>
      <input ref={inputRef} hidden type="file" accept="audio/*,.wav,.flac,.mp3,.aiff,.aif" onChange={event => { const file = event.target.files?.[0] || null; set({ file, analysis: null }); setError(""); }} />
    </div>;
  const progress = step === 1 ? (en ? "Measuring your track (1/2) …" : "Dein Track wird gemessen (1/2) …") : (en ? "Measuring reference (2/2) …" : "Referenz wird gemessen (2/2) …");

  return <section className="stream-tool">
    <Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15} />{en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero"><span><GitCompareArrows size={14} /> REFERENCE LAB</span><h1>{en ? <>Compare tracks with <em>measured facts.</em></> : <>Vergleiche Tracks mit <em>echten Messwerten.</em></>}</h1><p>{en ? "See how loudness, dynamics, tone and stereo image differ." : "Erkenne Unterschiede bei Lautheit, Dynamik, Klangfarbe und Stereobild."}</p></div>
    <div className="stem-grid"><Upload slot={a} set={setA} inputRef={aRef} label={en ? "YOUR TRACK" : "DEIN TRACK"} /><div className="stem-versus">VS</div><Upload slot={b} set={setB} inputRef={bRef} label={en ? "REFERENCE" : "REFERENZ"} /></div>
    {!metrics.length && <button className="conflict-run" disabled={!a.file || !b.file || busy} onClick={() => void run()}>{busy ? <Loader2 className="mixcheck-spin" /> : <GitCompareArrows size={18} />} {busy ? progress : (en ? "Compare tracks" : "Tracks vergleichen")}</button>}
    {error && <div className="mixcheck-error" role="alert"><span>{error}</span><button onClick={() => void run()}>{en ? "Try again" : "Erneut versuchen"}</button></div>}
    {metrics.length > 0 && <div className="stream-console reference-results"><div className="reference-metrics">{metrics.map(metric => <article key={metric.name}><span>{metric.name}</span><div><b>{metric.a.toFixed(1)}</b><i>{metric.unit}</i><em>{metric.b - metric.a > 0 ? "+" : ""}{(metric.b - metric.a).toFixed(1)}</em><b>{metric.b.toFixed(1)}</b></div><small>{en ? "Track · difference · reference" : "Track · Differenz · Referenz"}</small></article>)}</div><div className="reference-bands"><h2>{en ? "Tonal energy comparison" : "Vergleich der Klangenergie"}</h2>{bands.map(band => { const min = Math.min(band.a, band.b) - 6, max = Math.max(band.a, band.b); return <div key={band.n}><span>{band.n}</span><i><b style={{ width: `${Math.max(4, (band.a - min) / (max - min || 1) * 100)}%` }} /><em style={{ width: `${Math.max(4, (band.b - min) / (max - min || 1) * 100)}%` }} /></i><strong>{band.b - band.a > 0 ? "+" : ""}{(band.b - band.a).toFixed(1)} dB</strong></div>; })}</div>{recommendations.length > 0 && <div className="reference-advice"><h2>{en ? "What to check next" : "Was du als Nächstes prüfen solltest"}</h2>{recommendations.map(item => <p key={item}><CheckCircle2 size={15} /><span>{item}</span></p>)}</div>}<p className="stream-honesty"><CheckCircle2 size={14} />{en ? "Tracks are analyzed sequentially to keep the DSP service stable. Differences are measurements, not automatic mastering targets." : "Die Tracks werden nacheinander analysiert, damit der DSP-Dienst stabil bleibt. Unterschiede sind Messwerte, keine automatischen Mastering-Ziele."}</p></div>}
  </section>;
}
