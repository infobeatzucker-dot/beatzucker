"use client";

import { uiColor } from "@/lib/uiTheme";
import { startVisibleAnimation } from "@/lib/visibleAnimation";
import { findActiveRangeAsync, waveformPeaksAsync } from "@/lib/audioWorker";
import{useEffect,useRef,useState}from"react";import Link from"next/link";import{ArrowLeft,CheckCircle2,Download,Loader2,Scissors,UploadCloud}from"lucide-react";import type{Lang}from"@/lib/types/mastering";import{decodeAudio}from"@/lib/clientAudio";
import { useToolJob } from "@/lib/useToolJob";
import { toolError, validateToolFile } from "@/lib/toolClient";
import ToolLanguageNav from "./ToolLanguageNav";
import ToolJourney from "./ToolJourney";
function Wave({buffer,start,end,disabled,onChange,lang}:{buffer:AudioBuffer;start:number;end:number;disabled:boolean;onChange:(start:number,end:number)=>void;lang:Lang}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const edge = useRef<"start"|"end"|null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  useEffect(() => {
    let active = true; setPeaks(null);
    waveformPeaksAsync(buffer).then(value => { if (active) setPeaks(value); }).catch(() => {});
    return () => { active = false; };
  }, [buffer]);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const draw = () => {
      const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, box.width * dpr); canvas.height = Math.max(1, box.height * dpr); ctx.scale(dpr,dpr);
      const w = box.width, h = box.height;
      ctx.fillStyle = uiColor("#090d20"); ctx.fillRect(0,0,w,h); ctx.strokeStyle = uiColor("#66d4ff"); ctx.beginPath();
      peaks?.forEach((peak, index) => { const x = index / peaks.length * w, y = peak * h * .45; ctx.moveTo(x,h/2-y); ctx.lineTo(x,h/2+y); }); ctx.stroke();
      ctx.fillStyle = uiColor("rgba(6,9,23,.76)"); ctx.fillRect(0,0,start/buffer.duration*w,h); ctx.fillRect(end/buffer.duration*w,0,w-end/buffer.duration*w,h);
      ctx.strokeStyle = uiColor("#e861d6"); ctx.lineWidth = 2;
      for (const time of [start,end]) { const x = time / buffer.duration*w; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    };
    const animation = startVisibleAnimation(canvas, draw, { continuous: false });
    return () => animation.stop();
  }, [buffer,start,end,peaks]);
  function move(clientX:number) {
    if(disabled||!edge.current||!ref.current)return;
    const box=ref.current.getBoundingClientRect(),time=Math.max(0,Math.min(buffer.duration,(clientX-box.left)/Math.max(1,box.width)*buffer.duration));
    onChange(edge.current==="start"?Math.min(time,end-.4):start,edge.current==="end"?Math.max(time,start+.4):end);
  }
  return <canvas className="trim-waveform" ref={ref} role="img" aria-label={lang==="en"?"Selected waveform. Drag the nearest edge; start/end sliders are available below.":"Ausgewählter Wellenformbereich. Nächste Grenze ziehen; Start-/Endregler stehen darunter."}
    onPointerDown={e=>{if(disabled)return;const box=e.currentTarget.getBoundingClientRect(),time=(e.clientX-box.left)/Math.max(1,box.width)*buffer.duration;edge.current=Math.abs(time-start)<Math.abs(time-end)?"start":"end";e.currentTarget.setPointerCapture(e.pointerId);move(e.clientX);}}
    onPointerMove={e=>move(e.clientX)} onPointerUp={()=>{edge.current=null;}} onPointerCancel={()=>{edge.current=null;}}/>;
}

import { parseNormalizationResult, type NormalizationResult } from "@/lib/types/normalization";

export default function SilenceNormalizerTool({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const job=useToolJob(),context=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),previewing=useRef(false);
  const [playing,setPlaying]=useState(false);
  const input = useRef<HTMLInputElement>(null), inFlight = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [start, setStart] = useState(0), [end, setEnd] = useState(0);
  const [threshold, setThreshold] = useState(-50), [target, setTarget] = useState(-14);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [download, setDownload] = useState("");
  const [result, setResult] = useState<NormalizationResult | null>(null);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download); }, [download]);
  useEffect(()=>()=>{previewing.current=false;if(source.current){source.current.onended=null;try{source.current.stop();}catch{}}void context.current?.close();},[]);

  function stopPreview(){previewing.current=false;if(source.current){source.current.onended=null;try{source.current.stop();}catch{}source.current.disconnect();source.current=null;}setPlaying(false);}
  async function preview(){if(!buffer||busy)return;if(playing){stopPreview();return;}if(previewing.current)return;previewing.current=true;try{context.current??=new AudioContext();const ctx=context.current;await ctx.resume();if(!previewing.current)return;const s=ctx.createBufferSource();s.buffer=buffer;s.connect(ctx.destination);source.current=s;s.onended=()=>{s.disconnect();if(source.current===s){source.current=null;previewing.current=false;setPlaying(false);}};s.start(0,start,end-start);setPlaying(true);}catch(reason){previewing.current=false;setError(toolError(reason,lang));}}

  function invalidate() { stopPreview();setDownload(""); setResult(null); setError(""); }
  async function load(f: File) {
    if (inFlight.current) return;
    const task=job.start();
    inFlight.current = true; setBusy(true); invalidate(); setFile(null); setBuffer(null);
    try {
      validateToolFile(f);const decoded = await decodeAudio(f, 40 * 1024 * 1024);
      if (decoded.duration < .4 || decoded.duration > 600) throw new Error(en ? "Use audio between 0.4 seconds and 10 minutes." : "Bitte Audio zwischen 0,4 Sekunden und 10 Minuten verwenden.");
      const range = await findActiveRangeAsync(decoded, threshold,task.signal);
      if(!job.active(task))return;if(!range.active)throw Error("NO_SIGNAL");
      setFile(f); setBuffer(decoded);
      setStart(Math.min(range.start, Math.max(0, range.end - .4)));
      setEnd(Math.max(range.end, .4));
    } catch (reason) {
      if(job.active(task))setError(toolError(reason,lang));
    } finally { if(job.active(task)){inFlight.current = false; setBusy(false);} }
  }
  async function detect() {
    if (!buffer || inFlight.current) return;
    const task=job.start();
    inFlight.current = true; setBusy(true); invalidate();
    try {
    const range = await findActiveRangeAsync(buffer, threshold,task.signal);
    if(!job.active(task))return;if(!range.active)throw Error("NO_SIGNAL");
    setStart(Math.min(range.start, Math.max(0, range.end - .4)));
    setEnd(Math.max(range.end, .4)); invalidate();
    } catch(reason) { if(job.active(task))setError(toolError(reason,lang)); }
    finally { if(job.active(task)){inFlight.current = false; setBusy(false);} }
  }
  async function render() {
    if (!file || !buffer || inFlight.current) return;
    const task=job.start();
    inFlight.current = true; setBusy(true); invalidate();
    try {
      const body = new FormData();
      body.append("file", file); body.append("start", String(start));
      body.append("end", String(end)); body.append("target", String(target)); body.append("lang", lang);
      const response = await fetch("/api/silence-normalize", { method: "POST", body, signal: AbortSignal.any([task.signal,AbortSignal.timeout(175000)]) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || (en ? "Normalization failed." : "Normalisierung fehlgeschlagen."));
      }
      const measured = parseNormalizationResult(response.headers.get("X-Normalization-Stats"));
      const wav = await response.blob();
      if(!job.active(task))return;
      if (wav.size < 44) throw new Error(en ? "Empty audio result." : "Leeres Audioergebnis.");
      setResult(measured); setDownload(URL.createObjectURL(wav));
    } catch (reason) {
      if(job.active(task))setError(reason instanceof Error ? reason.message : toolError(reason,lang));
    } finally { if(job.active(task)){inFlight.current = false; setBusy(false);} }
  }
  const removed = buffer ? Math.max(0, buffer.duration - (end - start)) : 0;
  return <section className="stream-tool">
    <ToolLanguageNav lang={lang}/>
    <Link href={en ? "/en/tools" : "/tools"} className="tool-back"><ArrowLeft size={15}/>{en ? "All tools" : "Alle Tools"}</Link>
    <div className="stream-hero">
      <span><Scissors size={14}/> CLEAN START</span>
      <h1>{en ? <>Trim silence and <em>normalize LUFS.</em></> : <>Stille kürzen und <em>LUFS normalisieren.</em></>}</h1>
      <p>{en ? "Choose a section. Its loudness is measured after the cut and fades, then the actual 24-bit WAV is verified." : "Wähle einen Ausschnitt. Seine Lautheit wird nach Schnitt und Fades gemessen; anschließend wird die fertige 24-Bit-WAV geprüft."}</p>
    </div>
    <input ref={input} hidden type="file" accept="audio/wav,audio/flac,audio/mpeg,audio/aiff,.wav,.flac,.mp3,.aiff,.aif" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ""; }}/>
    {!buffer && <button className="stream-upload" disabled={busy} onClick={() => input.current?.click()}>
      <div>{busy ? <Loader2 className="mixcheck-spin"/> : <UploadCloud/>}</div>
      <h2>{busy ? (en ? "Decoding …" : "Dekodieren …") : (en ? "Choose audio file" : "Audiodatei auswählen")}</h2>
      <p>{en ? "WAV, FLAC, MP3 or AIFF · up to 40 MB" : "WAV, FLAC, MP3 oder AIFF · bis 40 MB"}</p>
    </button>}

    {busy&&<button className="tool-back" onClick={()=>{job.cancel();inFlight.current=false;setBusy(false);}}>{en?"Cancel":"Abbrechen"}</button>}
    <ToolJourney mode="feedback" tool="silence-normalizer" lang={lang} busy={busy} complete={!!download && !!result} incomplete={false} error={error} progress={buffer ? (en ? "Preparing the section; export includes measurement and verification …" : "Ausschnitt wird vorbereitet; beim Export wird gemessen und geprüft …") : (en ? "Decoding audio …" : "Audio wird dekodiert …")} analysis={null}/>
    {buffer && <div className="stream-console trim-console" aria-busy={busy}>
      <Wave buffer={buffer} start={start} end={end} disabled={busy} lang={lang} onChange={(a,b)=>{setStart(Math.max(0,a));setEnd(Math.min(buffer.duration,b));invalidate();}}/>
      <p>{en?"Click or drag an edge in the waveform, or use the precise sliders below.":"Eine Grenze in der Wellenform anklicken oder ziehen – oder die genauen Regler darunter nutzen."}</p>
      <button className="tool-back" disabled={busy} onClick={()=>void preview()}>{playing?(en?"Stop preview":"Vorhören stoppen"):(en?"Preview selected section":"Gewählten Ausschnitt vorhören")}</button>
      {download&&<audio controls src={download} aria-label={en?"Verified normalized output":"Geprüftes normalisiertes Ergebnis"}/>}
      <div className="trim-stats">
        <article><span>{en ? "Selected start" : "Gewählter Start"}</span><strong>{start.toFixed(2)} s</strong></article>
        <article><span>{en ? "Selected end" : "Gewähltes Ende"}</span><strong>{end.toFixed(2)} s</strong></article>
        <article><span>{en ? "Removed" : "Entfernt"}</span><strong>{removed.toFixed(2)} s</strong></article>
        <article><span>{en ? "Applied gain" : "Angewendeter Gain"}</span><strong>{result ? `${result.gain_db > 0 ? "+" : ""}${result.gain_db.toFixed(1)} dB` : "—"}</strong></article>
      </div>
      <div className="trim-controls">
        <label><span>{en ? "Silence threshold" : "Stille-Schwelle"} <b>{threshold} dBFS</b></span>
          <input type="range" min="-70" max="-30" value={threshold} disabled={busy} onChange={e => setThreshold(Number(e.target.value))}/>
          <button disabled={busy} onClick={detect}>{en ? "Detect again" : "Neu erkennen"}</button>
        </label>
        <label><span>{en ? "Start point" : "Startpunkt"} <b>{start.toFixed(2)} s</b></span>
          <input type="range" min="0" max={Math.max(0, end - .4)} step=".01" value={start} disabled={busy} onChange={e => { setStart(Math.max(0, Math.min(Number(e.target.value), end - .4))); invalidate(); }}/>
        </label>
        <label><span>{en ? "End point" : "Endpunkt"} <b>{end.toFixed(2)} s</b></span>
          <input type="range" min={start + .4} max={buffer.duration} step=".01" value={end} disabled={busy} onChange={e => { setEnd(Math.min(buffer.duration, Math.max(Number(e.target.value), start + .4))); invalidate(); }}/>
        </label>
        <label><span>{en ? "Target loudness" : "Ziellautheit"} <b>{target} LUFS</b></span>
          <input type="range" min="-23" max="-9" value={target} disabled={busy} onChange={e => { setTarget(Number(e.target.value)); invalidate(); }}/>
        </label>
      </div>
      {result && <div aria-live="polite">
        <div className="trim-stats">
          <article><span>{en ? "Section before gain" : "Ausschnitt vor Gain"}</span><strong>{result.before.integrated_lufs.toFixed(1)} LUFS</strong></article>
          <article><span>{en ? "Measured WAV loudness" : "Gemessene WAV-Lautheit"}</span><strong>{result.after.integrated_lufs.toFixed(1)} LUFS</strong></article>
          <article><span>{en ? "Measured WAV true peak" : "Gemessener WAV-True-Peak"}</span><strong>{result.after.true_peak.toFixed(2)} dBTP</strong></article>
          <article><span>{en ? "WAV duration" : "WAV-Dauer"}</span><strong>{result.duration.toFixed(2)} s</strong></article>
        </div>
        {result.peak_limited && <p className="stream-honesty">{en ? "The peak ceiling prevents reaching your loudness target. No limiter or compression is applied." : "Die Spitzenpegel-Grenze verhindert das Erreichen deiner Ziellautheit. Es wird kein Limiter und keine Kompression angewendet."}</p>}
      </div>}
      {download ? <a className="converter-download" href={download} download={`${file?.name.replace(/\.[^.]+$/, "")}-trimmed.wav`}><Download size={18}/>{en ? "Download verified WAV" : "Geprüfte WAV herunterladen"}</a>
        : <button className="conflict-run" disabled={busy} onClick={() => void render()}>{busy ? <Loader2 className="mixcheck-spin" size={18}/> : <Scissors size={18}/>} {busy ? (en ? "Measuring, rendering and verifying …" : "Messen, rendern und prüfen …") : (en ? "Render new WAV" : "Neue WAV rendern")}</button>}
      <button className="tool-back" disabled={busy} onClick={() => input.current?.click()}>{en ? "Choose another file" : "Andere Datei wählen"}</button>
      <p className="stream-honesty"><CheckCircle2 size={14}/>{en ? "Server-side measurement of the faded section and the exported WAV. Peak ceiling −1 dBTP, 10 ms edge fades, 24-bit WAV with dither. Minimum section: 0.4 s. Memory budget: 32 million selected channel samples (about 5.5 min of stereo at 48 kHz)." : "Servermessung des gefadeten Ausschnitts und der exportierten WAV. Spitzenpegel maximal −1 dBTP, 10-ms-Randfades, 24-Bit-WAV mit Dither. Ausschnitt mindestens 0,4 s. Speichergrenze: 32 Millionen ausgewählte Kanal-Samples (etwa 5,5 Min. Stereo bei 48 kHz)."}</p>
    </div>}
  <ToolJourney mode="recommendations" tool="silence-normalizer" lang={lang} busy={busy} complete={!!download && !!result} incomplete={false} error={error} progress={buffer ? (en ? "Preparing the section; export includes measurement and verification …" : "Ausschnitt wird vorbereitet; beim Export wird gemessen und geprüft …") : (en ? "Decoding audio …" : "Audio wird dekodiert …")} analysis={null}/>
</section>;
}
