"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock3, Headphones, Loader2, Music2, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";

import { requestToolAnalysis, toolError, tapTempo, TOOL_AUDIO_ACCEPT } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import ToolLanguageNav from "./ToolLanguageNav";
import ToolJourney from "./ToolJourney";

const CAMELOT: Record<string, string> = {
  "A minor": "8A", "E minor": "9A", "B minor": "10A", "F# minor": "11A", "C# minor": "12A", "G# minor": "1A", "D# minor": "2A", "A# minor": "3A", "F minor": "4A", "C minor": "5A", "G minor": "6A", "D minor": "7A",
  "C major": "8B", "G major": "9B", "D major": "10B", "A major": "11B", "E major": "12B", "B major": "1B", "F# major": "2B", "C# major": "3B", "G# major": "4B", "D# major": "5B", "A# major": "6B", "F major": "7B",
};
const CAMELOT_TO_KEY = Object.fromEntries(Object.entries(CAMELOT).map(([key, code]) => [code, key]));

function normalizeKey(value: string) { return value.replaceAll("♯", "#").replaceAll("♭", "b"); }
function compatibleKeys(code: string) {
  const match = /^(\d+)([AB])$/.exec(code); if (!match) return [];
  const number = Number(match[1]); const letter = match[2];
  return [`${number === 1 ? 12 : number - 1}${letter}`, `${number === 12 ? 1 : number + 1}${letter}`, `${number}${letter === "A" ? "B" : "A"}`]
    .map(item => ({ code: item, key: CAMELOT_TO_KEY[item] ?? item }));
}

export default function KeyBpmTool({ lang }: { lang: Lang }) {
  const job = useToolJob(); const en = lang === "en"; const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null); const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [taps, setTaps] = useState<number[]>([]);
  const key = normalizeKey(analysis?.key ?? "Unknown"); const camelot = CAMELOT[key] ?? "—";
  const compatible = useMemo(() => compatibleKeys(camelot), [camelot]);
  const tapBpm = useMemo(() => tapTempo(taps), [taps]);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);

  async function analyze(selected: File) {
    if(loading)return;const task=job.start();setLoading(true); setError(""); setAnalysis(null); setFile(selected); setTaps([]);
    if (url) URL.revokeObjectURL(url); setUrl(URL.createObjectURL(selected));
    try {
      const measured=await requestToolAnalysis(selected,"key-bpm",lang,task.signal);
      if(job.active(task))setAnalysis(measured);
    } catch (reason) { if(job.active(task))setError(toolError(reason,lang)); }
    finally { if(job.active(task))setLoading(false); }
  }
  function reset() { job.cancel();setLoading(false);setAnalysis(null); setFile(null); setError(""); setTaps([]); setUrl(""); }
  function tap() { const now = performance.now(); setTaps(previous => [...previous.filter(time => now - time < 10000), now].slice(-8)); }

  return <section className="stream-tool music-tool"><ToolLanguageNav lang={lang}/>
    <Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15}/> {en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero"><span><Music2 size={14}/> KEY & BPM</span><h1>{en ? <>Detect key and BPM <em>online.</em></> : <>Tonart und BPM <em>online erkennen.</em></>}</h1><p>{en ? "Detect tempo, key and Camelot code from a real audio analysis." : "Erkenne Tempo, Tonart und Camelot-Code durch eine echte Audioanalyse."}</p></div>
    {!analysis && <div className="stream-upload" role="button" tabIndex={loading ? -1 : 0} aria-busy={loading} onClick={() => !loading && inputRef.current?.click()} onKeyDown={event => { if (!loading && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); inputRef.current?.click(); } }}>
      <div>{loading ? <Loader2 className="mixcheck-spin" size={30}/> : <UploadCloud size={30}/>}</div><h2>{loading ? (en ? "Detecting rhythm and harmony …" : "Rhythmus und Harmonie werden erkannt …") : (en ? "Choose an audio file" : "Audiodatei auswählen")}</h2><p>{loading ? file?.name : (en ? "WAV, FLAC, MP3 or AIFF · max 40 MB" : "WAV, FLAC, MP3 oder AIFF · max. 40 MB")}</p>
      <input ref={inputRef} hidden type="file" accept={TOOL_AUDIO_ACCEPT} onChange={event => { const selected = event.target.files?.[0]; if (selected) void analyze(selected); }}/>
    </div>}
    {loading&&<button className="tool-back" onClick={reset}>{en?"Cancel":"Abbrechen"}</button>}

    <ToolJourney mode="feedback" tool="key-bpm" lang={lang} busy={loading} complete={!!analysis} incomplete={!!analysis && (analysis.bpm <= 0 || key === "Unknown")} error={error} progress={en ? "Detecting tempo and key …" : "Tempo und Tonart werden erkannt …"} analysis={analysis} onRetry={() => void reset()}/>
    {analysis && <div className="stream-console key-console">
      <div className="stream-file"><div><strong>{file?.name}</strong><span>{Math.floor(analysis.duration_seconds / 60)}:{String(Math.floor(analysis.duration_seconds % 60)).padStart(2,"0")} · {(analysis.sample_rate / 1000).toFixed(1)} kHz</span></div><button onClick={reset}><RotateCcw size={14}/> {en ? "Change" : "Wechseln"}</button></div>
      <div className="key-result-grid">
        <article className="key-primary"><span>{en ? "Detected tempo" : "Erkanntes Tempo"}</span><strong>{analysis.bpm > 0 ? Math.round(analysis.bpm) : "—"}<small>BPM</small></strong><div><i>{analysis.bpm > 0 ? Math.round(analysis.bpm / 2) : "—"}</i><b>½×</b><i>{analysis.bpm > 0 ? Math.round(analysis.bpm * 2) : "—"}</i><b>2×</b></div></article>
        <article className="key-primary"><span>{en ? "Detected key" : "Erkannte Tonart"}</span><strong>{key === "Unknown" ? (en?"Not determined":"Nicht bestimmbar") : key.replace(" minor", en ? " minor" : " Moll").replace(" major", en ? " major" : " Dur")}</strong><small>{en ? "Chroma-profile estimate" : "Schätzung aus Chroma-Profil"}</small></article>
        <article className="camelot-card"><span>CAMELOT</span><strong>{camelot}</strong><small>{en ? "DJ-friendly harmonic notation" : "DJ-taugliche harmonische Notation"}</small></article>
      </div>
      {compatible.length > 0 && <div className="compatible-keys"><div><Headphones size={18}/><span><strong>{en ? "Harmonically compatible" : "Harmonisch kompatibel"}</strong><small>{en ? "Same ring neighbours and relative major/minor" : "Nachbarn im selben Ring und parallele Dur-/Molltonart"}</small></span></div><div>{compatible.map(item => <span key={item.code}><b>{item.code}</b>{item.key.replace(" minor", en ? " min" : " Moll").replace(" major", en ? " maj" : " Dur")}</span>)}</div></div>}
      <div className="key-audio"><audio src={url} controls/><div className="tap-tempo"><button onClick={tap}><Clock3 size={17}/>{en ? "Tap tempo" : "Tempo tippen"}</button><span>{tapBpm ? `${Math.round(tapBpm)} BPM` : en ? "Tap at least twice" : "Mindestens zweimal tippen"}</span><button className="tap-reset" onClick={() => setTaps([])}>{en ? "Reset" : "Zurücksetzen"}</button></div></div>
      <p className="stream-honesty"><ShieldCheck size={14}/>{en ? "Tempo and key are algorithmic estimates. Half-time, double-time and ambiguous harmonies can produce alternatives; use your ears for the final decision." : "Tempo und Tonart sind algorithmische Schätzungen. Half-Time, Double-Time und mehrdeutige Harmonien können Alternativen ergeben – entscheide abschließend mit dem Gehör."}</p>
    </div>}
  <ToolJourney mode="recommendations" tool="key-bpm" lang={lang} busy={loading} complete={!!analysis} incomplete={!!analysis && (analysis.bpm <= 0 || key === "Unknown")} error={error} progress={en ? "Detecting tempo and key …" : "Tempo und Tonart werden erkannt …"} analysis={analysis} onRetry={() => void reset()}/>
</section>;
}
