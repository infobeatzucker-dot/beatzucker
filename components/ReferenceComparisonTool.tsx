"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, GitCompareArrows, Loader2, UploadCloud } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";

import { requestToolAnalysis, toolError, TOOL_AUDIO_ACCEPT } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import ToolLanguageNav from "./ToolLanguageNav";
import ToolABPlayer from "./ToolABPlayer";

type Slot = { file: File | null; analysis: AnalysisData | null };

export default function ReferenceComparisonTool({ lang }: { lang: Lang }) {
  const job=useToolJob(); const [relative,setRelative]=useState(true);
  const en = lang === "en";
  const aRef = useRef<HTMLInputElement>(null), bRef = useRef<HTMLInputElement>(null);
  const [a, setA] = useState<Slot>({ file: null, analysis: null });
  const [b, setB] = useState<Slot>({ file: null, analysis: null });
  const [busy, setBusy] = useState(false), [step, setStep] = useState<0 | 1 | 2>(0), [error, setError] = useState("");

  async function analyze(file:File,signal:AbortSignal) {return requestToolAnalysis(file,"reference-comparison",lang,signal);}

  async function run() {
    if (!a.file || !b.file || busy) return;
    const task=job.start();
    setBusy(true); setError("");
    try {
      setStep(1); const ownAnalysis = a.analysis ?? await analyze(a.file,task.signal); if(!job.active(task))return;setA(slot => ({ ...slot, analysis: ownAnalysis }));
      setStep(2); const referenceAnalysis = b.analysis ?? await analyze(b.file,task.signal); if(!job.active(task))return;setB(slot => ({ ...slot, analysis: referenceAnalysis }));
    } catch (reason) {
      if(job.active(task))setError(toolError(reason,lang));
    } finally { if(job.active(task)){setBusy(false); setStep(0);} }
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
    <div className="stem-upload" role="button" tabIndex={0} onClick={() => !busy && inputRef.current?.click()} onKeyDown={event => { if (!busy && (event.key === "Enter" || event.key === " ")) {event.preventDefault();inputRef.current?.click();} }}>
      <div><UploadCloud /></div><span>{label}</span><strong>{slot.file?.name || (en ? "Choose track" : "Track auswählen")}</strong><small>{slot.analysis ? (en ? "Measured" : "Gemessen") : "WAV · FLAC · MP3 · AIFF"}</small>
      <input ref={inputRef} hidden type="file" accept={TOOL_AUDIO_ACCEPT} onChange={event => { const file = event.target.files?.[0] || null; set({ file, analysis: null }); setError(""); }} />
    </div>;
  const progress = step === 1 ? (en ? "Measuring your track (1/2) …" : "Dein Track wird gemessen (1/2) …") : (en ? "Measuring reference (2/2) …" : "Referenz wird gemessen (2/2) …");

  return <section className="stream-tool">
    <ToolLanguageNav lang={lang}/><Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15} />{en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero"><span><GitCompareArrows size={14} /> REFERENCE LAB</span><h1>{en ? <>Compare tracks with <em>measured facts.</em></> : <>Vergleiche Tracks mit <em>echten Messwerten.</em></>}</h1><p>{en ? "See how loudness, dynamics, tone and stereo image differ." : "Erkenne Unterschiede bei Lautheit, Dynamik, Klangfarbe und Stereobild."}</p></div>
    <div className="stem-grid"><Upload slot={a} set={setA} inputRef={aRef} label={en ? "YOUR TRACK" : "DEIN TRACK"} /><div className="stem-versus">VS</div><Upload slot={b} set={setB} inputRef={bRef} label={en ? "REFERENCE" : "REFERENZ"} /></div>
    {!metrics.length && <button className="conflict-run" disabled={!a.file || !b.file || busy} onClick={() => void run()}>{busy ? <Loader2 className="mixcheck-spin" /> : <GitCompareArrows size={18} />} {busy ? progress : (en ? "Compare tracks" : "Tracks vergleichen")}</button>}
    {busy&&<button className="tool-back" onClick={()=>{job.cancel();setBusy(false);setStep(0);}}>{en?"Cancel":"Abbrechen"}</button>}
    {error && <div className="mixcheck-error" role="alert"><span>{error}</span><button onClick={() => void run()}>{en ? "Try again" : "Erneut versuchen"}</button></div>}
    {metrics.length > 0 && <div className="stream-console reference-results"><div className="reference-metrics">{metrics.map(metric => <article key={metric.name}><span>{metric.name}</span><div><b>{metric.a.toFixed(1)}</b><i>{metric.unit}</i><em>{metric.b - metric.a > 0 ? "+" : ""}{(metric.b - metric.a).toFixed(1)}</em><b>{metric.b.toFixed(1)}</b></div><small>{en ? "Track · difference · reference" : "Track · Differenz · Referenz"}</small></article>)}</div>{a.file&&b.file&&a.analysis&&b.analysis&&<ToolABPlayer a={a.file} b={b.file} aAnalysis={a.analysis} bAnalysis={b.analysis} lang={lang}/>}<div className="reference-bands"><label className="tool-option"><input type="checkbox" checked={relative} onChange={e=>setRelative(e.target.checked)}/>{en?"Compare tonal balance independently of loudness":"Klangbalance unabhängig von Lautheit vergleichen"}</label><h2>{en ? "Tonal energy comparison" : "Vergleich der Klangenergie"}</h2>{bands.map(band => { const av=band.a-(relative?a.analysis!.integrated_lufs:0),bv=band.b-(relative?b.analysis!.integrated_lufs:0);const min = Math.min(av,bv) - 6, max = Math.max(av,bv); return <div key={band.n}><span>{band.n}</span><i><b style={{ width: `${Math.max(4, (av - min) / (max - min || 1) * 100)}%` }} /><em style={{ width: `${Math.max(4, (bv - min) / (max - min || 1) * 100)}%` }} /></i><strong>{bv - av > 0 ? "+" : ""}{(bv - av).toFixed(1)} dB</strong></div>; })}</div>{recommendations.length > 0 && <div className="reference-advice"><h2>{en ? "What to check next" : "Was du als Nächstes prüfen solltest"}</h2>{recommendations.map(item => <p key={item}><CheckCircle2 size={15} /><span>{item}</span></p>)}</div>}<p className="stream-honesty"><CheckCircle2 size={14} />{en ? "Tracks are analyzed sequentially to keep the DSP service stable. Differences are measurements, not automatic mastering targets." : "Die Tracks werden nacheinander analysiert, damit der DSP-Dienst stabil bleibt. Unterschiede sind Messwerte, keine automatischen Mastering-Ziele."}</p></div>}
  </section>;
}
