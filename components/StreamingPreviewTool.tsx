"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Gauge, Loader2, Play, Radio, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";

const PLATFORMS = [
  { id: "spotify", name: "Spotify", target: -14, ceiling: -1, color: "#1ed760" },
  { id: "apple", name: "Apple Music", target: -16, ceiling: -1, color: "#fa496d" },
  { id: "youtube", name: "YouTube", target: -14, ceiling: -1, color: "#ff4b55" },
  { id: "tidal", name: "Tidal", target: -14, ceiling: -1, color: "#55e8ff" },
  { id: "amazon", name: "Amazon Music", target: -14, ceiling: -2, color: "#ffad32" },
  { id: "deezer", name: "Deezer", target: -15, ceiling: -1, color: "#a97cff" },
] as const;

export default function StreamingPreviewTool({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const inputRef = useRef<HTMLInputElement>(null); const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null); const gainRef = useRef<GainNode | null>(null);
  const [file, setFile] = useState<File | null>(null); const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [platformId, setPlatformId] = useState("spotify");
  const [mode, setMode] = useState<"original" | "preview">("preview"); const [codec, setCodec] = useState("aac256");
  const platform = PLATFORMS.find(p => p.id === platformId) ?? PLATFORMS[0];
  const values = useMemo(() => {
    if (!analysis) return null;
    const requested = platform.target - analysis.integrated_lufs;
    const headroomLimited = requested > 0 ? Math.min(requested, platform.ceiling - analysis.true_peak) : requested;
    const gain = Math.min(12, headroomLimited); const peak = analysis.true_peak + gain;
    const margin = codec === "mp3128" ? 1.5 : codec === "mp3320" ? 1.2 : 1;
    return { requested, gain, peak, safe: peak <= -margin, limited: gain < requested - .05 };
  }, [analysis, platform, codec]);

  useEffect(() => { if (gainRef.current && values) gainRef.current.gain.setTargetAtTime(mode === "preview" ? Math.pow(10, values.gain / 20) : 1, contextRef.current?.currentTime ?? 0, .015); }, [mode, values]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); void contextRef.current?.close(); }, [url]);

  async function ensureAudio() {
    if (!audioRef.current) return;
    if (!contextRef.current) {
      const context = new AudioContext(); const source = context.createMediaElementSource(audioRef.current); const gain = context.createGain();
      source.connect(gain).connect(context.destination); contextRef.current = context; gainRef.current = gain;
    }
    if (contextRef.current.state === "suspended") await contextRef.current.resume();
    if (values && gainRef.current) gainRef.current.gain.value = mode === "preview" ? Math.pow(10, values.gain / 20) : 1;
  }

  async function analyze(selected: File) {
    setLoading(true); setError(""); setAnalysis(null); setFile(selected);
    if (url) URL.revokeObjectURL(url); setUrl(URL.createObjectURL(selected));
    try {
      const body = new FormData(); body.append("file", selected);
      const response = await fetch("/api/mix-check", { method: "POST", body }); const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.analysis) throw new Error(payload.error || (en ? "Analysis failed." : "Analyse fehlgeschlagen."));
      setAnalysis(payload.analysis);
    } catch (reason) { setError(reason instanceof Error ? reason.message : (en ? "Analysis failed." : "Analyse fehlgeschlagen.")); }
    finally { setLoading(false); }
  }
  function reset() { setAnalysis(null); setFile(null); setError(""); setMode("preview"); if (url) URL.revokeObjectURL(url); setUrl(""); }

  return <section className="stream-tool">
    <Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15} /> {en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero"><span><Radio size={14} /> STREAMING PREVIEW</span><h1>{en ? <>How will your track <em>translate?</em></> : <>Wie kommt dein Track <em>im Streaming an?</em></>}</h1><p>{en ? "Hear loudness normalization and check codec headroom before release." : "Höre die Lautheitsnormalisierung und prüfe den Codec-Headroom vor dem Release."}</p></div>
    {!analysis && <div className="stream-upload" role="button" tabIndex={loading ? -1 : 0} aria-busy={loading} onClick={() => !loading && inputRef.current?.click()} onKeyDown={e => { if (!loading && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click(); } }}>
      <div>{loading ? <Loader2 className="mixcheck-spin" size={30} /> : <UploadCloud size={30} />}</div><h2>{loading ? (en ? "Measuring loudness …" : "Lautheit wird vermessen …") : (en ? "Choose your master" : "Master auswählen")}</h2><p>{loading ? file?.name : (en ? "WAV, FLAC, MP3 or AIFF · max 40 MB" : "WAV, FLAC, MP3 oder AIFF · max. 40 MB")}</p>
      <input ref={inputRef} hidden type="file" accept=".wav,.flac,.mp3,.aiff,.aif,audio/*" onChange={e => { const f=e.target.files?.[0]; if(f) void analyze(f); }} />
    </div>}
    {error && <div className="mixcheck-error" role="alert"><AlertTriangle size={16}/><span>{error}</span><button onClick={reset}>{en ? "Try again" : "Erneut versuchen"}</button></div>}
    {analysis && values && <div className="stream-console">
      <div className="stream-file"><div><strong>{file?.name}</strong><span>{analysis.integrated_lufs.toFixed(1)} LUFS · {analysis.true_peak.toFixed(1)} dBTP</span></div><button onClick={reset}><RotateCcw size={14}/> {en ? "Change" : "Wechseln"}</button></div>
      <div className="stream-platforms">{PLATFORMS.map(p => <button key={p.id} className={p.id===platform.id?"active":""} style={{"--platform":p.color} as React.CSSProperties} onClick={()=>setPlatformId(p.id)}><i/><strong>{p.name}</strong><span>{p.target} LUFS</span></button>)}</div>
      <div className="stream-meters">
        <article><span>{en ? "Platform gain" : "Plattform-Gain"}</span><strong className={values.gain > 0 ? "positive" : ""}>{values.gain > 0 ? "+" : ""}{values.gain.toFixed(1)} dB</strong><small>{values.gain < -.05 ? (en ? "Playback turns down" : "Wiedergabe wird leiser") : values.gain > .05 ? (en ? "Playback turns up" : "Wiedergabe wird lauter") : (en ? "Almost unchanged" : "Nahezu unverändert")}</small></article>
        <article><span>{en ? "Predicted true peak" : "Prognose True Peak"}</span><strong>{values.peak.toFixed(1)} dBTP</strong><small>{platform.name} · {platform.ceiling} dBTP</small></article>
        <article className={values.safe?"safe":"risk"}><span>{en ? "Codec headroom" : "Codec-Headroom"}</span><strong>{values.safe ? (en ? "SAFE" : "SICHER") : (en ? "CHECK" : "PRÜFEN")}</strong><small>{values.safe ? (en ? "Low overs risk" : "Geringes Overs-Risiko") : (en ? "Possible codec overs" : "Mögliche Codec-Overs")}</small></article>
      </div>
      {values.limited && <div className="stream-note"><ShieldCheck size={16}/>{en ? "The boost is limited by the platform headroom instead of forcing the target loudness." : "Die Anhebung wird durch den Plattform-Headroom begrenzt, statt den Zielwert zu erzwingen."}</div>}
      <div className="stream-player"><audio ref={audioRef} src={url} controls onPlay={()=>void ensureAudio()} /><div className="stream-ab"><button className={mode==="original"?"active":""} onClick={()=>setMode("original")}><span>A</span>{en?"Original":"Original"}</button><button className={mode==="preview"?"active":""} onClick={()=>setMode("preview")}><span>B</span>{en?"Platform preview":"Plattform-Vorschau"}</button></div></div>
      <div className="codec-forecast"><div><Gauge size={18}/><span><strong>{en ? "Codec risk forecast" : "Codec-Risikoprognose"}</strong><small>{en ? "Select the intended delivery codec." : "Wähle den geplanten Auslieferungs-Codec."}</small></span></div><select value={codec} onChange={e=>setCodec(e.target.value)}><option value="aac256">AAC 256</option><option value="mp3320">MP3 320</option><option value="mp3128">MP3 128</option></select></div>
      <p className="stream-honesty"><CheckCircle2 size={14}/>{en ? "A/B playback applies the measured platform gain in real time. Codec safety is a true-peak forecast; this version does not pretend to play a transcoded file." : "Die A/B-Wiedergabe wendet den gemessenen Plattform-Gain in Echtzeit an. Die Codec-Sicherheit ist eine True-Peak-Prognose; diese Version täuscht keine transcodierte Wiedergabe vor."}</p>
    </div>}
  </section>;
}
