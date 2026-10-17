"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileAudio2, Loader2, LockKeyhole, RotateCcw, ScanSearch, UploadCloud, Waves } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

import { decodeAudio } from "@/lib/clientAudio";
import { analyzeSpectrumAsync } from "@/lib/audioWorker";
import type { Spectrum } from "@/lib/workerAnalysis";
type Result = { kick: Spectrum; bass: Spectrum; overlap: number[]; score: number; peakHz: number; spectral: number; temporal: number };
import { startVisibleAnimation } from "@/lib/visibleAnimation";
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

function SpectrumChart({ result }: { result: Result }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const canvas = ref.current; if (!canvas) return; const drawFrame=()=>{const box = canvas.getBoundingClientRect(); const scale = devicePixelRatio || 1; canvas.width = box.width * scale; canvas.height = box.height * scale; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(scale, scale); const w = box.width, h = box.height; ctx.clearRect(0,0,w,h); ctx.strokeStyle="rgba(255,255,255,.055)"; ctx.lineWidth=1; for(let i=0;i<5;i++){const y=12+(h-32)*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    const draw = (values:number[], color:string, fill:string) => { ctx.beginPath(); values.forEach((value,index)=>{const x=index/(values.length-1)*w,y=h-20-value*(h-38); index?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.lineTo(w,h-20);ctx.lineTo(0,h-20);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.beginPath();values.forEach((value,index)=>{const x=index/(values.length-1)*w,y=h-20-value*(h-38);index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();};
    draw(result.bass.levels,"#b56cff","rgba(181,108,255,.08)"); draw(result.kick.levels,"#4bc8ff","rgba(75,200,255,.08)");
    ctx.fillStyle="#59637d";ctx.font="10px monospace"; [40,60,100,160,250,350].forEach(hz=>{const x=Math.log(hz/MIN_HZ)/Math.log(MAX_HZ/MIN_HZ)*w;ctx.fillText(`${hz}`,Math.min(w-24,Math.max(0,x-8)),h-4);});};const loop=startVisibleAnimation(canvas,drawFrame,{continuous:false});return()=>loop.stop();
  }, [result]); return <canvas ref={ref} className="conflict-chart" aria-label="Kick and bass spectrum overlay"/>;
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
      <div className="conflict-layout"><article className={`conflict-score ${grade}`}><div style={{"--score":`${result.score * 3.6}deg`} as React.CSSProperties}><strong>{result.score}</strong><span>/ 100</span></div><small>{en ? "Overlap index" : "Überlagerungsindex"}</small></article><article className="conflict-spectrum"><div className="spectrum-legend"><span><i className="kick"/>Kick</span><span><i className="bass"/>Bass</span><b>35–350 Hz</b></div><SpectrumChart result={result}/></article></div>
      <div className="conflict-metrics"><article><span>{en ? "Strongest collision" : "Stärkste Kollision"}</span><strong>{Math.max(35,Math.floor((result.peakHz-Math.max(result.kick.resolutionHz,result.bass.resolutionHz))/5)*5)}–{Math.min(350,Math.ceil((result.peakHz+Math.max(result.kick.resolutionHz,result.bass.resolutionHz))/5)*5)} Hz</strong><small>{en ? "Highest shared spectral energy" : "Höchste gemeinsame Spektralenergie"}</small></article><article><span>{en ? "Spectral similarity" : "Spektrale Ähnlichkeit"}</span><strong>{Math.round(result.spectral*100)}%</strong><small>{en ? "Shape overlap in the low end" : "Formüberlagerung im Low End"}</small></article><article><span>{en ? "Time co-activity" : "Zeitliche Gleichzeitigkeit"}</span><strong>{Math.round(result.temporal*100)}%</strong><small>{en ? "Same timestamps from file start" : "Gleiche Zeitpunkte ab Dateianfang"}</small></article></div>
      <div className="conflict-advice"><CheckCircle2 size={18}/><div><strong>{grade === "high" ? (en ? `Review the highlighted frequency region.` : `Prüfe den hervorgehobenen Frequenzbereich.`) : (en ? "No automatic EQ decision needed." : "Keine automatische EQ-Entscheidung nötig.")}</strong><span>{grade === "high" ? (en ? "Try arrangement, envelope or sidechain changes before cutting a fixed frequency. Soloed spectra do not reveal the full musical context." : "Prüfe Arrangement, Hüllkurven oder Sidechain, bevor du eine feste Frequenz absenkst. Einzelne Spektren zeigen nicht den gesamten musikalischen Kontext.") : (en ? "Listen in context. A low score does not guarantee a balanced mix." : "Höre im Kontext. Ein niedriger Wert garantiert noch keinen ausgewogenen Mix.")}</span></div></div>
      {Math.abs(result.kick.duration-result.bass.duration)>.25&&<p className="stream-note">{en?"Different lengths: time comparison uses only the common duration from file start. Leading offsets must be aligned in your DAW.":"Unterschiedliche Längen: Der Zeitvergleich nutzt nur die gemeinsame Dauer ab Dateianfang. Startversätze bitte vorher in deiner DAW ausrichten."}</p>}<p className="stream-honesty"><CheckCircle2 size={14}/>{en ? "The complete files are sampled with overlapping FFT windows; time activity is compared from the same starting timestamp in approximate 0.25-second bins. It is a diagnostic indicator, not a claim that overlap is inherently bad." : "Die ganzen Dateien werden mit überlappenden FFT-Fenstern geprüft; der Zeitvergleich erfolgt ab demselben Startzeitpunkt in ungefähr 0,25-Sekunden-Schritten. Er ist ein Diagnosehinweis – keine Behauptung, dass Überlagerung grundsätzlich schlecht ist."}</p>
    </div>}
  <ToolJourney mode="recommendations" tool="kick-bass-conflict" lang={lang} busy={loading} complete={!!result} incomplete={false} error={error} progress={en ? "Comparing low-frequency activity …" : "Tieftonaktivität wird verglichen …"} analysis={null} onRetry={() => void run()}/>
</section>;
}
