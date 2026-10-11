"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Gauge, Loader2, Radio, RotateCcw, ShieldCheck, UploadCloud, WandSparkles } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";

import { requestToolAnalysis, toolError, responseError, TOOL_AUDIO_ACCEPT } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import ToolLanguageNav from "./ToolLanguageNav";

const PLATFORMS = [
  { id: "spotify", name: "Spotify", target: -14, ceiling: -1, color: "#1ed760" },
  { id: "apple", name: "Apple Music", target: -16, ceiling: -1, color: "#fa496d" },
  { id: "youtube", name: "YouTube", target: -14, ceiling: -1, color: "#ff4b55" },
  { id: "tidal", name: "Tidal", target: -14, ceiling: -1, color: "#55e8ff" },
  { id: "amazon", name: "Amazon Music", target: -14, ceiling: -2, color: "#ffad32" },
  { id: "deezer", name: "Deezer", target: -15, ceiling: -1, color: "#a97cff" },
] as const;

export default function StreamingPreviewTool({ lang }: { lang: Lang }) {
  const job=useToolJob(), position=useRef({time:0,resume:false}), switching=useRef(false);const [codecLufs,setCodecLufs]=useState<number|null>(null);
  const en = lang === "en";
  const inputRef = useRef<HTMLInputElement>(null); const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null); const gainRef = useRef<GainNode | null>(null);
  const [file, setFile] = useState<File | null>(null); const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [platformId, setPlatformId] = useState("spotify");
  const [mode, setMode] = useState<"original" | "preview" | "codec">("preview"); const [codec, setCodec] = useState("aac256");
  const [codecUrl, setCodecUrl] = useState(""); const [codecPeak, setCodecPeak] = useState<number|null>(null); const [codecBusy, setCodecBusy] = useState(false);
  const platform = PLATFORMS.find(p => p.id === platformId) ?? PLATFORMS[0];
  const values = useMemo(() => {
    if (!analysis) return null;
    const requested = platform.target - analysis.integrated_lufs;
    const headroomLimited = requested > 0 ? Math.min(requested, platform.ceiling - analysis.true_peak) : requested;
    const gain = Math.min(12, headroomLimited); const peak = analysis.true_peak + gain;
    const margin = codec === "mp3128" ? 1.5 : codec === "mp3320" ? 1.2 : 1;
    const codecGain=codecLufs!==null?Math.min(analysis.integrated_lufs+gain-codecLufs,codecPeak!==null?platform.ceiling-codecPeak:12):gain;
    const measuredPeak=codecPeak!==null?codecPeak+codecGain:null;
    return { requested, gain, peak, codecGain,measuredPeak,safe:measuredPeak!==null?measuredPeak<=platform.ceiling:peak<=-margin, limited: gain < requested - .05 };
  }, [analysis, platform, codec,codecPeak,codecLufs]);

  useEffect(() => { if (gainRef.current && values) gainRef.current.gain.setTargetAtTime(mode === "original" ? 1 : Math.pow(10, (mode==="codec"?values.codecGain:values.gain) / 20), contextRef.current?.currentTime ?? 0, .015); }, [mode, values]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => { if (codecUrl) URL.revokeObjectURL(codecUrl); }, [codecUrl]);
  useEffect(() => () => { void contextRef.current?.close(); }, []);

  async function ensureAudio() {
    if (!audioRef.current) return;
    if (!contextRef.current) {
      const context = new AudioContext(); const source = context.createMediaElementSource(audioRef.current); const gain = context.createGain();
      source.connect(gain).connect(context.destination); contextRef.current = context; gainRef.current = gain;
    }
    if (contextRef.current.state === "suspended") await contextRef.current.resume();
    if (values && gainRef.current) gainRef.current.gain.value = mode === "original" ? 1 : Math.pow(10, (mode==="codec"?values.codecGain:values.gain) / 20);
  }

  async function analyze(selected: File) {
    if(loading||codecBusy)return;const task=job.start();setCodecLufs(null);setLoading(true); setError(""); setAnalysis(null); setFile(selected);
    setCodecUrl(""); setCodecPeak(null); setMode("preview");
    if (url) URL.revokeObjectURL(url); setUrl(URL.createObjectURL(selected));
    try {
      const measured=await requestToolAnalysis(selected,"streaming-preview",lang,task.signal);if(job.active(task))setAnalysis(measured);
    } catch (reason) { if(job.active(task))setError(toolError(reason,lang)); }
    finally { if(job.active(task))setLoading(false); }
  }
  async function renderCodec(){if(!file||codecBusy)return;const task=job.start();setCodecBusy(true);setError("");try{const body=new FormData();body.append("file",file);body.append("codec",codec);const response=await fetch("/api/codec-preview",{method:"POST",body,signal:AbortSignal.any([task.signal,AbortSignal.timeout(175000)])});if(!response.ok)throw responseError(response);const blob=await response.blob();if(!job.active(task))return;const lh=response.headers.get("X-Encoded-LUFS"),lv=lh&&lh.trim()?Number(lh):NaN;setCodecLufs(Number.isFinite(lv)?lv:null);position.current={time:audioRef.current?.currentTime??0,resume:!!audioRef.current&&!audioRef.current.paused};audioRef.current?.pause();if(codecUrl)URL.revokeObjectURL(codecUrl);setCodecUrl(URL.createObjectURL(blob));const header=response.headers.get("X-Encoded-True-Peak");const peak=header===null||header.trim()===""?null:Number(header);setCodecPeak(peak!==null&&Number.isFinite(peak)?peak:null);setMode("codec");}catch(reason){if(job.active(task))setError(toolError(reason,lang))}finally{if(job.active(task))setCodecBusy(false)}}
  function reset() { job.cancel();setLoading(false);setCodecBusy(false);setCodecLufs(null);position.current={time:0,resume:false};audioRef.current?.pause();void contextRef.current?.close();contextRef.current=null;gainRef.current=null;setAnalysis(null); setFile(null); setError(""); setMode("preview"); if (url) URL.revokeObjectURL(url);if(codecUrl)URL.revokeObjectURL(codecUrl);setCodecUrl("");setCodecPeak(null);setUrl(""); }

  function selectMode(next:"original"|"preview"|"codec"){const audio=audioRef.current;if((mode==="codec")!==(next==="codec")){position.current={time:audio?.currentTime??0,resume:!!audio&&!audio.paused};audio?.pause();}setMode(next);}
  async function loaded(){const audio=audioRef.current;if(!audio)return;audio.currentTime=Math.min(position.current.time,Math.max(0,audio.duration-.01));if(position.current.resume){position.current.resume=false;try{await ensureAudio();await audio.play();}catch{}}}
  return <section className="stream-tool"><ToolLanguageNav lang={lang}/>
    <Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15} /> {en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero"><span><Radio size={14} /> STREAMING PREVIEW</span><h1>{en ? <>How will your track <em>translate?</em></> : <>Wie kommt dein Track <em>im Streaming an?</em></>}</h1><p>{en ? "Hear loudness normalization and check codec headroom before release." : "Höre die Lautheitsnormalisierung und prüfe den Codec-Headroom vor dem Release."}</p></div>
    {!analysis && <div className="stream-upload" role="button" tabIndex={loading ? -1 : 0} aria-busy={loading} onClick={() => !loading && inputRef.current?.click()} onKeyDown={e => { if (!loading && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click(); } }}>
      <div>{loading ? <Loader2 className="mixcheck-spin" size={30} /> : <UploadCloud size={30} />}</div><h2>{loading ? (en ? "Measuring loudness …" : "Lautheit wird vermessen …") : (en ? "Choose your master" : "Master auswählen")}</h2><p>{loading ? file?.name : (en ? "WAV, FLAC, MP3 or AIFF · max 40 MB" : "WAV, FLAC, MP3 oder AIFF · max. 40 MB")}</p>
      <input ref={inputRef} hidden type="file" accept={TOOL_AUDIO_ACCEPT} onChange={e => { const f=e.target.files?.[0]; if(f) void analyze(f); }} />
    </div>}
    {(loading||codecBusy)&&<button className="tool-back" onClick={()=>{job.cancel();setLoading(false);setCodecBusy(false);}}>{en?"Cancel":"Abbrechen"}</button>}
    {error && <div className="mixcheck-error" role="alert"><AlertTriangle size={16}/><span>{error}</span><button onClick={reset}>{en ? "Try again" : "Erneut versuchen"}</button></div>}
    {analysis && values && <div className="stream-console">
      <div className="stream-file"><div><strong>{file?.name}</strong><span>{analysis.integrated_lufs.toFixed(1)} LUFS · {analysis.true_peak.toFixed(1)} dBTP</span></div><button disabled={codecBusy} onClick={reset}><RotateCcw size={14}/> {en ? "Change" : "Wechseln"}</button></div>
      <p className="stream-note">{en?"Platform presets are simplified estimates. Device settings, normalization modes and album playback may differ.":"Plattform-Presets sind vereinfachte Prognosen. Geräteeinstellungen, Normalisierungsmodi und Albumwiedergabe können abweichen."}</p><div className="stream-platforms">{PLATFORMS.map(p => <button key={p.id} className={p.id===platform.id?"active":""} style={{"--platform":p.color} as React.CSSProperties} onClick={()=>setPlatformId(p.id)}><i/><strong>{p.name}</strong><span>{p.target} LUFS</span></button>)}</div>
      <div className="stream-meters">
        <article><span>{en ? "Platform gain" : "Plattform-Gain"}</span><strong className={values.gain > 0 ? "positive" : ""}>{values.gain > 0 ? "+" : ""}{values.gain.toFixed(1)} dB</strong><small>{values.gain < -.05 ? (en ? "Playback turns down" : "Wiedergabe wird leiser") : values.gain > .05 ? (en ? "Playback turns up" : "Wiedergabe wird lauter") : (en ? "Almost unchanged" : "Nahezu unverändert")}</small></article>
        <article><span>{en ? "Predicted true peak" : "Prognose True Peak"}</span><strong>{values.peak.toFixed(1)} dBTP</strong><small>{platform.name} · {platform.ceiling} dBTP</small></article>
        <article className={values.safe?"safe":"risk"}><span>{en ? "Codec headroom" : "Codec-Headroom"}</span><strong>{values.safe ? (en ? "HEADROOM" : "RESERVE") : (en ? "CHECK" : "PRÜFEN")}</strong><small>{values.measuredPeak!==null?(en?"Measured codec after gain":"Gemessener Codec nach Gain"):values.safe ? (en ? "Low overs risk" : "Geringes Overs-Risiko") : (en ? "Possible codec overs" : "Mögliche Codec-Overs")}</small></article>
      </div>
      {values.limited && <div className="stream-note"><ShieldCheck size={16}/>{en ? "The boost is limited by the platform headroom instead of forcing the target loudness." : "Die Anhebung wird durch den Plattform-Headroom begrenzt, statt den Zielwert zu erzwingen."}</div>}
      <div className="stream-player"><audio ref={audioRef} src={mode==="codec"&&codecUrl?codecUrl:url} controls onLoadedMetadata={()=>void loaded()} onPlay={()=>void ensureAudio()} /><div className="stream-ab"><button className={mode==="original"?"active":""} onClick={()=>selectMode("original")}><span>A</span>Original</button><button className={mode==="preview"?"active":""} onClick={()=>selectMode("preview")}><span>B</span>{en?"Normalized":"Normalisiert"}</button>{codecUrl&&<button className={mode==="codec"?"active":""} onClick={()=>selectMode("codec")}><span>C</span>{codec.toUpperCase()}</button>}</div></div>
      <div className="codec-forecast"><div><Gauge size={18}/><span><strong>{en ? "Codec risk forecast" : "Codec-Risikoprognose"}</strong><small>{en ? "Select the intended delivery codec." : "Wähle den geplanten Auslieferungs-Codec."}</small></span></div><select value={codec} disabled={codecBusy} onChange={e=>{setCodec(e.target.value);setCodecUrl("");setCodecPeak(null);setCodecLufs(null);if(mode==="codec")setMode("preview")}}><option value="aac256">AAC 256</option><option value="mp3320">MP3 320</option><option value="mp3128">MP3 128</option></select></div>
      <button className="codec-render" disabled={codecBusy} onClick={()=>void renderCodec()}>{codecBusy?<Loader2 className="mixcheck-spin" size={16}/>:<WandSparkles size={16}/>} {codecBusy?(en?"Encoding real preview …":"Echte Vorschau wird codiert …"):(en?"Generate real codec A/B":"Echten Codec-A/B-Vergleich erzeugen")}</button>{values.measuredPeak!==null&&<p className="stream-note">{en?"Codec peak after playback gain: ":"Codec-Peak nach Wiedergabe-Gain: "}{values.measuredPeak.toFixed(2)} dBTP · {values.codecGain.toFixed(2)} dB {en?"gain":"Gain"}</p>}{codecPeak!==null&&<div className="stream-note"><CheckCircle2 size={16}/>{en?`Encoded file measured at ${codecPeak.toFixed(1)} dBTP.`:`Codierte Datei gemessen: ${codecPeak.toFixed(1)} dBTP.`}</div>}
      <p className="stream-honesty"><CheckCircle2 size={14}/>{codecUrl?(en?"Mode C plays the actual server-encoded file. Gain uses encoded loudness when available; peak headroom can limit matching. Switching retains the playback position; residual codec timing differences are possible.":"Modus C spielt die tatsächlich serverseitig codierte Datei. Der Gain nutzt die codierte Lautheit, soweit verfügbar; Peak-Reserve kann den Abgleich begrenzen. Der Wechsel behält die Abspielposition bei; kleine Codec-Zeitunterschiede bleiben möglich."):(en?"A/B applies measured platform gain in real time. Generate mode C to hear an actually encoded file.":"A/B wendet den gemessenen Plattform-Gain in Echtzeit an. Erzeuge Modus C, um eine tatsächlich codierte Datei zu hören.")}</p>
    </div>}
  </section>;
}
