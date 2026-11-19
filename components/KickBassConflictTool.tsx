"use client";


import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileAudio2, Loader2, LockKeyhole, RotateCcw, ScanSearch, UploadCloud, Waves } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

import { decodeAudio } from "@/lib/clientAudio";
import { analyzeSpectrumAsync } from "@/lib/audioWorker";
import type { Spectrum } from "@/lib/workerAnalysis";
type Result = { kick: Spectrum; bass: Spectrum; overlap: number[]; score: number; peakHz: number; spectral: number; temporal: number };
import { useToolJob } from "@/lib/useToolJob";
import { toolError, TOOL_AUDIO_ACCEPT } from "@/lib/toolClient";
import ToolLanguageNav from "./ToolLanguageNav";
import ToolJourney from "./ToolJourney";
const MIN_HZ = 35, MAX_HZ = 350;
async function analyzeFile(file: File,signal:AbortSignal): Promise<Spectrum> { const buffer=await decodeAudio(file,40*1024*1024);return analyzeSpectrumAsync(buffer,signal); }

export function compare(kick: Spectrum, bass: Spectrum): Result {
  if(!kick.valid||!bass.valid)throw Error("NO_BASS");
  const overlap = kick.levels.map((value, index) => Math.min(value, bass.levels[index]));
  const spectral = overlap.reduce((sum, value) => sum + value, 0) / (kick.levels.reduce((sum, value, index) => sum + Math.max(value, bass.levels[index]), 0) || 1);
  const count = Math.min(kick.activity.length, bass.activity.length); let temporal = 0;
  for (let i = 0; i < count; i++) temporal += Math.min(kick.activity[i], bass.activity[i]); temporal /= Math.max(1, count);
  const peakIndex = overlap.indexOf(Math.max(...overlap)); const score = Math.round(Math.max(0, Math.min(100, (spectral * .68 + temporal * .32) * 100)));
  return { kick, bass, overlap, score, peakHz: Math.round(kick.frequencies[peakIndex]), spectral, temporal };
}

const ranges = [
  { min: 35, max: 60, de: "Prüfe im Mix, welche Spur das tiefste Fundament tragen soll.", en: "Listen in the mix and decide which track should carry the deepest sub." },
  { min: 60, max: 100, de: "Hör auf die Kick-Attacke. Teste eine kürzere Bass-Hüllkurve oder leichtes Sidechain-Ducking.", en: "Listen for the kick attack. Try a shorter bass envelope or gentle sidechain ducking." },
  { min: 100, max: 180, de: "Prüfe, ob Kick und Bass im Grundton zu viel Körper addieren. Vergleiche bei gleicher Abhörlautstärke.", en: "Check whether the kick and bass add too much body around their fundamentals. Compare at equal monitoring levels." },
  { min: 180, max: 350, de: "Hör auf Boxigkeit und die Lesbarkeit des Basses auf kleinen Lautsprechern.", en: "Listen for boxiness and check whether the bass stays clear on small speakers." },
];

function SpectrumChart({ result, lang }: { result: Result; lang: Lang }) {
  const en = lang === "en";
  const [selected, setSelected] = useState(() => ranges.findIndex(band => result.peakHz < band.max));
  const range = ranges[selected < 0 ? ranges.length - 1 : selected];
  const x = (hz: number) => 14 + Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ) * 472;
  const y = (level: number) => 135 - level * 115;
  const curve = (levels: number[]) => levels.map((value, index) => `${x(result.kick.frequencies[index])},${y(value)}`).join(" ");
  const shared = result.overlap.reduce((best, level, index) => {
    const hz = result.kick.frequencies[index];
    return hz >= range.min && (hz < range.max || range.max === MAX_HZ) && level > (result.overlap[best] ?? 0) ? index : best;
  }, -1);
  return <>
    <svg viewBox="0 0 500 165" preserveAspectRatio="none" className="conflict-chart" role="img" aria-label={en ? "Normalized kick and bass spectra with shared energy highlighted" : "Normierte Kick- und Bassspektren mit markierter Überlagerung"}>
      <rect x={x(range.min)} y="12" width={x(range.max) - x(range.min)} height="123" rx="5" className="bz-conflict-region"/>
      {[20, 49, 78, 106, 135].map(tick => <line className="bz-signal-grid" key={tick} x1="14" x2="486" y1={tick} y2={tick}/>)}
      <polygon className="bz-conflict-fill" points={`14,135 ${curve(result.overlap)} 486,135`}/>
      <polyline className="bz-trace-a" points={curve(result.kick.levels)}/>
      <polyline className="bz-trace-b" points={curve(result.bass.levels)}/>
      {shared >= 0 && <circle className="bz-conflict-peak" cx={x(result.kick.frequencies[shared])} cy={y(result.overlap[shared])} r="4"/>}
      {[35, 60, 100, 180, 350].map(hz => <text className="bz-conflict-axis" key={hz} x={x(hz)} y="154" textAnchor="middle">{hz}</text>)}
    </svg>
    <div className="bz-change-points bz-conflict-tabs">{ranges.map((band, index) => <button key={band.min} type="button" aria-pressed={band === range} onClick={() => setSelected(index)}>{band.min}–{band.max} Hz</button>)}</div>
    <p className="bz-conflict-tip">{shared >= 0 && <strong>{en ? "Peak overlap" : "Stärkste Überlagerung"} · {Math.round(result.kick.frequencies[shared])} Hz</strong>} {range[lang]}</p>
  </>;
}

export default function KickBassConflictTool({ lang }: { lang: Lang }) {
  const job=useToolJob(); const en = lang === "en"; const kickRef = useRef<HTMLInputElement>(null); const bassRef = useRef<HTMLInputElement>(null);
  const [kick, setKick] = useState<File|null>(null); const [bass, setBass] = useState<File|null>(null); const [result, setResult] = useState<Result|null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function run() { if (!kick || !bass || loading) return;const task=job.start(); setLoading(true); setError(""); setResult(null); try { const kickSpectrum=await analyzeFile(kick,task.signal),bassSpectrum=await analyzeFile(bass,task.signal);if(job.active(task))setResult(compare(kickSpectrum,bassSpectrum)); } catch (reason) { if(job.active(task))setError(toolError(reason,lang)); } finally { if(job.active(task))setLoading(false); } }
  const grade = result ? result.score >= 68 ? "high" : result.score >= 42 ? "medium" : "low" : "";
  const gradeText = grade === "high" ? (en ? "Strong overlap" : "Starke Überlagerung") : grade === "medium" ? (en ? "Moderate overlap" : "Mittlere Überlagerung") : (en ? "Low overlap" : "Geringe Überlagerung");
  const Upload = ({ type, file, inputRef }: { type:"kick"|"bass"; file:File|null; inputRef:React.RefObject<HTMLInputElement|null> }) => <div className={`stem-upload ${file ? "has-file" : ""}`} role="button" tabIndex={0} aria-disabled={loading} onClick={()=>!loading&&inputRef.current?.click()} onKeyDown={event=>{if(!loading&&(event.key==="Enter"||event.key===" ")){event.preventDefault();inputRef.current?.click();}}}><div>{file?<FileAudio2 size={25}/>:<UploadCloud size={25}/>}</div><span>{type === "kick" ? "KICK" : "BASS"}</span><strong>{file?.name ?? (en ? `Choose ${type} stem` : `${type === "kick" ? "Kick" : "Bass"}-Stem auswählen`)}</strong><small>{file ? `${(file.size/1048576).toFixed(1)} MB` : "WAV · FLAC · MP3 · AIFF"}</small><input ref={inputRef} hidden type="file" disabled={loading} accept={TOOL_AUDIO_ACCEPT} onChange={event=>{const selected=event.target.files?.[0]??null; type==="kick"?setKick(selected):setBass(selected);setResult(null);}}/></div>;
  return <section className="stream-tool conflict-tool"><ToolLanguageNav lang={lang}/>
    <Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15}/> {en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero"><span><Waves size={14}/> LOW-END LAB</span><h1>{en ? <>Check kick and bass <em>for frequency conflicts.</em></> : <>Kick und Bass <em>auf Frequenzkonflikte prüfen.</em></>}</h1><p>{en ? "Compare kick and bass spectra and find the frequency range where both compete most." : "Vergleiche Kick- und Bassspektrum und finde den Frequenzbereich, in dem beide am stärksten konkurrieren."}</p></div>
    <div className="stem-grid"><Upload type="kick" file={kick} inputRef={kickRef}/><div className="stem-versus">VS</div><Upload type="bass" file={bass} inputRef={bassRef}/></div>
    <div className="local-badge"><LockKeyhole size={15}/><span><strong>{en ? "Local analysis" : "Lokale Analyse"}</strong>{en ? "Audio stays in your browser and is not uploaded." : "Das Audio bleibt in deinem Browser und wird nicht hochgeladen."}</span></div>
    {!result && <button className="conflict-run" disabled={!kick || !bass || loading} onClick={()=>void run()}>{loading?<Loader2 className="mixcheck-spin" size={18}/>:<ScanSearch size={18}/>} {loading ? (en ? "Calculating FFT overlap …" : "FFT-Überlagerung wird berechnet …") : (en ? "Analyze conflict" : "Konflikt analysieren")}</button>}
    {loading&&<button className="tool-back" onClick={()=>{job.cancel();setLoading(false);}}>{en?"Cancel":"Abbrechen"}</button>}

    <ToolJourney mode="feedback" tool="kick-bass-conflict" lang={lang} busy={loading} complete={!!result} incomplete={false} error={error} progress={en ? "Comparing low-frequency activity …" : "Tieftonaktivität wird verglichen …"} analysis={null} onRetry={() => void run()}/>
    {result && <div className="stream-console conflict-console">
      <div className="conflict-head"><div><span>{en ? "LOW-END OVERLAP" : "LOW-END-ÜBERLAGERUNG"}</span><h2>{gradeText}</h2></div><button onClick={()=>setResult(null)}><RotateCcw size={14}/> {en ? "New analysis" : "Neue Analyse"}</button></div>
      <div className="conflict-layout"><article className={`conflict-score ${grade}`}><div style={{"--score":`${result.score * 3.6}deg`} as React.CSSProperties}><strong>{result.score}</strong><span>/ 100</span></div><small>{en ? "Overlap index" : "Überlagerungsindex"}</small></article><article className="conflict-spectrum"><div className="spectrum-legend"><span><i className="kick"/>Kick</span><span><i className="bass"/>Bass</span><span className="bz-overlap-label"><i/>{en ? "Shared energy" : "Überlagerung"}</span></div><SpectrumChart result={result} lang={lang}/></article></div>
      <div className="conflict-metrics"><article><span>{en ? "Strongest collision" : "Stärkste Kollision"}</span><strong>{Math.max(35,Math.floor((result.peakHz-Math.max(result.kick.resolutionHz,result.bass.resolutionHz))/5)*5)}–{Math.min(350,Math.ceil((result.peakHz+Math.max(result.kick.resolutionHz,result.bass.resolutionHz))/5)*5)} Hz</strong><small>{en ? "Highest shared spectral energy" : "Höchste gemeinsame Spektralenergie"}</small></article><article><span>{en ? "Spectral similarity" : "Spektrale Ähnlichkeit"}</span><strong>{Math.round(result.spectral*100)}%</strong><small>{en ? "Shape overlap in the low end" : "Formüberlagerung im Low End"}</small></article><article><span>{en ? "Time co-activity" : "Zeitliche Gleichzeitigkeit"}</span><strong>{Math.round(result.temporal*100)}%</strong><small>{en ? "Same timestamps from file start" : "Gleiche Zeitpunkte ab Dateianfang"}</small></article></div>
      <div className="conflict-advice"><CheckCircle2 size={18}/><div><strong>{grade === "high" ? (en ? `Review the highlighted frequency region.` : `Prüfe den hervorgehobenen Frequenzbereich.`) : (en ? "No automatic EQ decision needed." : "Keine automatische EQ-Entscheidung nötig.")}</strong><span>{grade === "high" ? (en ? "Try arrangement, envelope or sidechain changes before cutting a fixed frequency. Soloed spectra do not reveal the full musical context." : "Prüfe Arrangement, Hüllkurven oder Sidechain, bevor du eine feste Frequenz absenkst. Einzelne Spektren zeigen nicht den gesamten musikalischen Kontext.") : (en ? "Listen in context. A low score does not guarantee a balanced mix." : "Höre im Kontext. Ein niedriger Wert garantiert noch keinen ausgewogenen Mix.")}</span></div></div>
      {Math.abs(result.kick.duration-result.bass.duration)>.25&&<p className="stream-note">{en?"Different lengths: time comparison uses only the common duration from file start. Leading offsets must be aligned in your DAW.":"Unterschiedliche Längen: Der Zeitvergleich nutzt nur die gemeinsame Dauer ab Dateianfang. Startversätze bitte vorher in deiner DAW ausrichten."}</p>}<p className="stream-honesty"><CheckCircle2 size={14}/>{en ? "The complete files are sampled with overlapping FFT windows; time activity is compared from the same starting timestamp in approximate 0.25-second bins. It is a diagnostic indicator, not a claim that overlap is inherently bad." : "Die ganzen Dateien werden mit überlappenden FFT-Fenstern geprüft; der Zeitvergleich erfolgt ab demselben Startzeitpunkt in ungefähr 0,25-Sekunden-Schritten. Er ist ein Diagnosehinweis – keine Behauptung, dass Überlagerung grundsätzlich schlecht ist."}</p>
    </div>}
  <ToolJourney mode="recommendations" tool="kick-bass-conflict" lang={lang} busy={loading} complete={!!result} incomplete={false} error={error} progress={en ? "Comparing low-frequency activity …" : "Tieftonaktivität wird verglichen …"} analysis={null} onRetry={() => void run()}/>
</section>;
}
