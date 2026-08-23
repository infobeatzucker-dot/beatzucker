"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileAudio2, Loader2, LockKeyhole, RotateCcw, ScanSearch, UploadCloud, Waves } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

type Spectrum = { frequencies: number[]; levels: number[]; activity: number[]; duration: number };
type Result = { kick: Spectrum; bass: Spectrum; overlap: number[]; score: number; peakHz: number; spectral: number; temporal: number };
const FFT_SIZE = 4096; const BINS = 42; const MIN_HZ = 35; const MAX_HZ = 350;

function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; } }
  for (let length = 2; length <= n; length <<= 1) { const angle = -2 * Math.PI / length; const wLenR = Math.cos(angle); const wLenI = Math.sin(angle); for (let i = 0; i < n; i += length) { let wr = 1, wi = 0; for (let j = 0; j < length / 2; j++) { const even = i + j, odd = even + length / 2; const vr = real[odd] * wr - imag[odd] * wi, vi = real[odd] * wi + imag[odd] * wr; const ur = real[even], ui = imag[even]; real[even] = ur + vr; imag[even] = ui + vi; real[odd] = ur - vr; imag[odd] = ui - vi; const nextR = wr * wLenR - wi * wLenI; wi = wr * wLenI + wi * wLenR; wr = nextR; } } }
}

async function analyzeFile(file: File): Promise<Spectrum> {
  if (file.size > 40 * 1024 * 1024) throw new Error("SIZE");
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer()); const frames = Math.min(56, Math.max(12, Math.floor(buffer.duration * 1.5)));
    const sums = new Float64Array(BINS); const activity = new Float64Array(frames); const frequencies = Array.from({ length: BINS }, (_, index) => MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, index / (BINS - 1)));
    for (let frame = 0; frame < frames; frame++) {
      const center = Math.floor((frame + .5) / frames * buffer.length); const start = Math.max(0, Math.min(buffer.length - FFT_SIZE, center - FFT_SIZE / 2));
      const real = new Float64Array(FFT_SIZE); const imag = new Float64Array(FFT_SIZE);
      for (let i = 0; i < FFT_SIZE; i++) { let sample = 0; for (let channel = 0; channel < buffer.numberOfChannels; channel++) sample += buffer.getChannelData(channel)[start + i] ?? 0; real[i] = sample / buffer.numberOfChannels * (.5 - .5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1))); }
      fft(real, imag); let frameEnergy = 0;
      for (let bin = 0; bin < BINS; bin++) { const fftBin = Math.max(1, Math.min(FFT_SIZE / 2 - 1, Math.round(frequencies[bin] * FFT_SIZE / buffer.sampleRate))); const power = real[fftBin] ** 2 + imag[fftBin] ** 2; sums[bin] += power; frameEnergy += power; }
      activity[frame] = frameEnergy;
      if (frame % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    const db = Array.from(sums, value => 10 * Math.log10(value / frames + 1e-14)); const floor = Math.max(...db) - 48;
    const levels = db.map(value => Math.max(0, Math.min(1, (value - floor) / 48))); const activityMax = Math.max(...activity, 1e-12);
    return { frequencies, levels, activity: Array.from(activity, value => Math.sqrt(value / activityMax)), duration: buffer.duration };
  } finally { await context.close(); }
}

function compare(kick: Spectrum, bass: Spectrum): Result {
  const overlap = kick.levels.map((value, index) => Math.min(value, bass.levels[index]));
  const spectral = overlap.reduce((sum, value) => sum + value, 0) / (kick.levels.reduce((sum, value, index) => sum + Math.max(value, bass.levels[index]), 0) || 1);
  const count = Math.min(kick.activity.length, bass.activity.length); let temporal = 0;
  for (let i = 0; i < count; i++) temporal += Math.min(kick.activity[i], bass.activity[i]); temporal /= Math.max(1, count);
  const peakIndex = overlap.indexOf(Math.max(...overlap)); const score = Math.round(Math.max(0, Math.min(100, (spectral * .68 + temporal * .32) * 100)));
  return { kick, bass, overlap, score, peakHz: Math.round(kick.frequencies[peakIndex]), spectral, temporal };
}

function SpectrumChart({ result }: { result: Result }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const canvas = ref.current; if (!canvas) return; const box = canvas.getBoundingClientRect(); const scale = devicePixelRatio || 1; canvas.width = box.width * scale; canvas.height = box.height * scale; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(scale, scale); const w = box.width, h = box.height; ctx.clearRect(0,0,w,h); ctx.strokeStyle="rgba(255,255,255,.055)"; ctx.lineWidth=1; for(let i=0;i<5;i++){const y=12+(h-32)*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    const draw = (values:number[], color:string, fill:string) => { ctx.beginPath(); values.forEach((value,index)=>{const x=index/(values.length-1)*w,y=h-20-value*(h-38); index?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.lineTo(w,h-20);ctx.lineTo(0,h-20);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.beginPath();values.forEach((value,index)=>{const x=index/(values.length-1)*w,y=h-20-value*(h-38);index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();};
    draw(result.bass.levels,"#b56cff","rgba(181,108,255,.08)"); draw(result.kick.levels,"#4bc8ff","rgba(75,200,255,.08)");
    ctx.fillStyle="#59637d";ctx.font="10px monospace"; [40,60,100,160,250,350].forEach(hz=>{const x=Math.log(hz/MIN_HZ)/Math.log(MAX_HZ/MIN_HZ)*w;ctx.fillText(`${hz}`,Math.min(w-24,Math.max(0,x-8)),h-4);});
  }, [result]); return <canvas ref={ref} className="conflict-chart" aria-label="Kick and bass spectrum overlay"/>;
}

export default function KickBassConflictTool({ lang }: { lang: Lang }) {
  const en = lang === "en"; const kickRef = useRef<HTMLInputElement>(null); const bassRef = useRef<HTMLInputElement>(null);
  const [kick, setKick] = useState<File|null>(null); const [bass, setBass] = useState<File|null>(null); const [result, setResult] = useState<Result|null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function run() { if (!kick || !bass) return; setLoading(true); setError(""); setResult(null); try { const [kickSpectrum,bassSpectrum] = await Promise.all([analyzeFile(kick),analyzeFile(bass)]); setResult(compare(kickSpectrum,bassSpectrum)); } catch (reason) { setError(reason instanceof Error && reason.message === "SIZE" ? (en ? "Each file may be up to 40 MB." : "Jede Datei darf maximal 40 MB groß sein.") : (en ? "One of the files could not be decoded." : "Eine der Dateien konnte nicht dekodiert werden.")); } finally { setLoading(false); } }
  const grade = result ? result.score >= 68 ? "high" : result.score >= 42 ? "medium" : "low" : "";
  const gradeText = grade === "high" ? (en ? "Strong overlap" : "Starke Überlagerung") : grade === "medium" ? (en ? "Moderate overlap" : "Mittlere Überlagerung") : (en ? "Low overlap" : "Geringe Überlagerung");
  const Upload = ({ type, file, inputRef }: { type:"kick"|"bass"; file:File|null; inputRef:React.RefObject<HTMLInputElement|null> }) => <div className={`stem-upload ${file ? "has-file" : ""}`} role="button" tabIndex={0} onClick={()=>inputRef.current?.click()} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();inputRef.current?.click();}}}><div>{file?<FileAudio2 size={25}/>:<UploadCloud size={25}/>}</div><span>{type === "kick" ? "KICK" : "BASS"}</span><strong>{file?.name ?? (en ? `Choose ${type} stem` : `${type === "kick" ? "Kick" : "Bass"}-Stem auswählen`)}</strong><small>{file ? `${(file.size/1048576).toFixed(1)} MB` : "WAV · FLAC · MP3 · AIFF"}</small><input ref={inputRef} hidden type="file" accept=".wav,.flac,.mp3,.aiff,.aif,audio/*" onChange={event=>{const selected=event.target.files?.[0]??null; type==="kick"?setKick(selected):setBass(selected);setResult(null);}}/></div>;
  return <section className="stream-tool conflict-tool">
    <Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15}/> {en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero"><span><Waves size={14}/> LOW-END LAB</span><h1>{en ? <>Make room in the <em>low end.</em></> : <>Schaffe Platz im <em>Low End.</em></>}</h1><p>{en ? "Compare kick and bass spectra and find the frequency range where both compete most." : "Vergleiche Kick- und Bassspektrum und finde den Frequenzbereich, in dem beide am stärksten konkurrieren."}</p></div>
    <div className="stem-grid"><Upload type="kick" file={kick} inputRef={kickRef}/><div className="stem-versus">VS</div><Upload type="bass" file={bass} inputRef={bassRef}/></div>
    <div className="local-badge"><LockKeyhole size={15}/><span><strong>{en ? "Local analysis" : "Lokale Analyse"}</strong>{en ? "Audio stays in your browser and is not uploaded." : "Das Audio bleibt in deinem Browser und wird nicht hochgeladen."}</span></div>
    {!result && <button className="conflict-run" disabled={!kick || !bass || loading} onClick={()=>void run()}>{loading?<Loader2 className="mixcheck-spin" size={18}/>:<ScanSearch size={18}/>} {loading ? (en ? "Calculating FFT overlap …" : "FFT-Überlagerung wird berechnet …") : (en ? "Analyze conflict" : "Konflikt analysieren")}</button>}
    {error && <div className="mixcheck-error" role="alert"><AlertTriangle size={16}/><span>{error}</span></div>}
    {result && <div className="stream-console conflict-console">
      <div className="conflict-head"><div><span>{en ? "LOW-END OVERLAP" : "LOW-END-ÜBERLAGERUNG"}</span><h2>{gradeText}</h2></div><button onClick={()=>setResult(null)}><RotateCcw size={14}/> {en ? "New analysis" : "Neue Analyse"}</button></div>
      <div className="conflict-layout"><article className={`conflict-score ${grade}`}><div style={{"--score":`${result.score * 3.6}deg`} as React.CSSProperties}><strong>{result.score}</strong><span>/ 100</span></div><small>{en ? "Overlap index" : "Überlagerungsindex"}</small></article><article className="conflict-spectrum"><div className="spectrum-legend"><span><i className="kick"/>Kick</span><span><i className="bass"/>Bass</span><b>35–350 Hz</b></div><SpectrumChart result={result}/></article></div>
      <div className="conflict-metrics"><article><span>{en ? "Strongest collision" : "Stärkste Kollision"}</span><strong>{result.peakHz} Hz</strong><small>{en ? "Highest shared spectral energy" : "Höchste gemeinsame Spektralenergie"}</small></article><article><span>{en ? "Spectral similarity" : "Spektrale Ähnlichkeit"}</span><strong>{Math.round(result.spectral*100)}%</strong><small>{en ? "Shape overlap in the low end" : "Formüberlagerung im Low End"}</small></article><article><span>{en ? "Time co-activity" : "Zeitliche Gleichzeitigkeit"}</span><strong>{Math.round(result.temporal*100)}%</strong><small>{en ? "Aligned energy across the tracks" : "Gleichzeitige Energie beider Spuren"}</small></article></div>
      <div className="conflict-advice"><CheckCircle2 size={18}/><div><strong>{grade === "high" ? (en ? `Start around ${result.peakHz} Hz.` : `Beginne bei etwa ${result.peakHz} Hz.`) : (en ? "No automatic EQ decision needed." : "Keine automatische EQ-Entscheidung nötig.")}</strong><span>{grade === "high" ? (en ? "Try arrangement, envelope or sidechain changes before cutting a fixed frequency. Soloed spectra do not reveal the full musical context." : "Prüfe Arrangement, Hüllkurven oder Sidechain, bevor du eine feste Frequenz absenkst. Einzelne Spektren zeigen nicht den gesamten musikalischen Kontext.") : (en ? "Listen in context. A low score does not guarantee a balanced mix." : "Höre im Kontext. Ein niedriger Wert garantiert noch keinen ausgewogenen Mix.")}</span></div></div>
      <p className="stream-honesty"><CheckCircle2 size={14}/>{en ? "The index combines normalized spectral overlap and aligned low-frequency activity. It is a diagnostic indicator, not a claim that overlap is inherently bad." : "Der Index kombiniert normalisierte Spektralüberlagerung und zeitgleich aktive Tieftonenergie. Er ist ein Diagnosehinweis – keine Behauptung, dass Überlagerung grundsätzlich schlecht ist."}</p>
    </div>}
  </section>;
}
