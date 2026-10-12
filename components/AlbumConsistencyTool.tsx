"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Disc3, FilePlus2, Loader2, ScanLine, Trash2 } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";
import { median, requestToolAnalysis, toolError, TOOL_AUDIO_ACCEPT, validateToolFile } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import ToolLanguageNav from "./ToolLanguageNav";
import ToolJourney from "./ToolJourney";

type Track = {id:number;file:File;analysis?:AnalysisData;error?:string};
export function albumStats(tracks: Track[]) {
  const complete = tracks.filter((t):t is Track & {analysis:AnalysisData}=>!!t.analysis);
  if (complete.length < 2) return null;
  const lufs = complete.map(t=>t.analysis.integrated_lufs), centroids = complete.map(t=>t.analysis.spectral_centroid);
  return {target:median(lufs), spread:Math.max(...lufs)-Math.min(...lufs), toneSpread:(Math.max(...centroids)-Math.min(...centroids))/1000};
}
export default function AlbumConsistencyTool({lang}:{lang:Lang}) {
  const en = lang === "en", input = useRef<HTMLInputElement>(null), sequence = useRef(0), job = useToolJob();
  const [tracks,setTracks] = useState<Track[]>([]), [busy,setBusy] = useState(false), [progress,setProgress] = useState(0), [error,setError] = useState("");
  const complete = tracks.filter((t):t is Track & {analysis:AnalysisData}=>!!t.analysis), pending = tracks.filter(t=>!t.analysis);
  const stats = useMemo(()=>albumStats(tracks),[tracks]);
  const allComplete = tracks.length>=2 && !pending.length;
  const quality = stats ? stats.spread<=1.5&&stats.toneSpread<=1.5 ? "good" : stats.spread<=3&&stats.toneSpread<=3 ? "medium" : "high" : "";
  function add(list: FileList | null) {
    if (!list || busy) return;
    const incoming:Track[]=[]; setError("");
    for (const file of Array.from(list).slice(0,Math.max(0,8-tracks.length))) {
      try {validateToolFile(file);incoming.push({id:++sequence.current,file});} catch(reason) {setError(toolError(reason,lang));}
    }
    setTracks(items=>[...items,...incoming]); if(input.current)input.current.value="";
  }
  async function analyze() {
    if (busy || tracks.length<2 || !pending.length) return;
    const task=job.start(); setBusy(true);setError("");setProgress(0);
    try {
      for (let i=0;i<pending.length;i++) {
        const track=pending[i];setProgress(i+1);
        try {
          const analysis=await requestToolAnalysis(track.file,"album-consistency",lang,task.signal);
          if(!job.active(task))return;
          setTracks(items=>items.map(t=>t.id===track.id?{...t,analysis,error:undefined}:t));
        } catch(reason) {
          if(!job.active(task))return;
          setTracks(items=>items.map(t=>t.id===track.id?{...t,error:toolError(reason,lang)}:t));
        }
      }
    } finally {if(job.active(task))setBusy(false);}
  }
  function cancel(){job.cancel();setBusy(false);}
  return <section className="stream-tool album-tool">
    <Link href={en?"/en/tools":"/tools"} className="tool-back"><ArrowLeft size={15}/>{en?"All tools":"Alle Tools"}</Link><ToolLanguageNav lang={lang}/>
    <div className="stream-hero"><span><Disc3 size={14}/> RELEASE SEQUENCE</span><h1>{en?<>Does your album feel <em>like one record?</em></>:<>Klingt dein Album <em>wie ein Werk?</em></>}</h1><p>{en?"Compare loudness, dynamics and tonal indicators across two to eight tracks.":"Vergleiche Lautheit, Dynamik und Klanghinweise von zwei bis acht Tracks."}</p></div>
    <button className="album-drop" disabled={busy||tracks.length>=8} onClick={()=>input.current?.click()}><FilePlus2/><span><strong>{en?"Add album or EP tracks":"Album- oder EP-Tracks hinzufügen"}</strong><small>{en?"WAV, FLAC, MP3, AIFF · 40 MB each · 2–8 tracks":"WAV, FLAC, MP3, AIFF · je 40 MB · 2–8 Tracks"}</small></span></button>
    <input ref={input} hidden multiple disabled={busy} type="file" accept={TOOL_AUDIO_ACCEPT} onChange={e=>add(e.target.files)}/>

    {tracks.length>0&&<div className="album-list">{tracks.map((track,index)=><article key={track.id}><b>{String(index+1).padStart(2,"0")}</b><div><strong>{track.file.name}</strong><span>{track.analysis?track.analysis.integrated_lufs.toFixed(1)+" LUFS · "+track.analysis.true_peak.toFixed(1)+" dBTP · DR "+track.analysis.dr_value.toFixed(1):track.error||(en?"Not measured yet":"Noch nicht gemessen")}</span></div>{track.analysis&&<i className="done"><CheckCircle2 size={16}/></i>}<button disabled={busy} onClick={()=>setTracks(items=>items.filter(t=>t.id!==track.id))} aria-label={en?"Remove track":"Track entfernen"}><Trash2 size={15}/></button></article>)}</div>}
    {tracks.length===1&&<p role="status">{en?"Add at least one more track to compare the sequence.":"Füge mindestens einen weiteren Track hinzu, um die Reihenfolge zu vergleichen."}</p>}
    {tracks.length>=2&&pending.length>0&&<button className="conflict-run" disabled={busy} onClick={()=>void analyze()}>{busy?<Loader2 className="mixcheck-spin"/>:<ScanLine size={18}/>} {busy?(en?"Analyzing "+progress+" of "+pending.length+" pending tracks …":"Analysiere "+progress+" von "+pending.length+" ausstehenden Tracks …"):(en?"Analyze pending tracks":"Ausstehende Tracks analysieren")}</button>}
    {busy&&<button className="tool-back" onClick={cancel}>{en?"Cancel":"Abbrechen"}</button>}
    {tracks.length>=2&&<p role="status" aria-live="polite">{en?complete.length+" of "+tracks.length+" tracks measured.":complete.length+" von "+tracks.length+" Tracks gemessen."}</p>}
    <ToolJourney mode="feedback" tool="album-consistency" lang={lang} busy={busy} complete={allComplete} incomplete={!busy && tracks.some(t => !!t.error)} error={error} progress={(en ? "Measuring pending track " : "Ausstehender Track wird gemessen: ") + progress} analysis={null} onRetry={() => void analyze()}/>
    {stats&&<div className="stream-console album-results"><div className="conflict-head"><div><span>{en?"SEQUENCE CONSISTENCY":"SEQUENZ-KONSISTENZ"}</span><h2>{!allComplete?(en?"Partial results — not a complete album check":"Teilergebnis – noch kein vollständiger Album-Check"):quality==="good"?(en?"Small measured differences":"Geringe gemessene Unterschiede"):quality==="medium"?(en?"Some differences to review":"Einige Unterschiede prüfen"):(en?"Noticeable jumps":"Deutliche Sprünge")}</h2></div></div>
      <div className="album-metrics"><article><span>{en?"Loudness spread":"Lautheitsstreuung"}</span><strong>{stats.spread.toFixed(1)} LU</strong><small>{en?"Quietest to loudest measured track":"Leisester bis lautester gemessener Track"}</small></article><article><span>{en?"Spectral centroid spread":"Streuung des Spektralschwerpunkts"}</span><strong>{stats.toneSpread.toFixed(1)} kHz</strong><small>{en?"A tonal indicator, not a complete tonal assessment":"Klanghinweis, keine vollständige Klangbewertung"}</small></article><article><span>{en?"Sequence reference":"Sequenz-Referenz"}</span><strong>{stats.target.toFixed(1)} LUFS</strong><small>{en?"Median of measured tracks, not a mastering target":"Median gemessener Tracks, kein Mastering-Zielwert"}</small></article></div>
      <div className="album-table"><div className="album-table-head"><span># / Track</span><span>LUFS</span><span>dBTP</span><span>{en?"Suggested level trim":"Pegelhinweis"}</span></div>{complete.map(track=>{const requested=stats.target-track.analysis.integrated_lufs,gain=Math.min(requested,-1-track.analysis.true_peak);return <div key={track.id}><span><b>{tracks.findIndex(t=>t.id===track.id)+1}</b>{track.file.name}</span><span>{track.analysis.integrated_lufs.toFixed(1)}</span><span>{track.analysis.true_peak.toFixed(1)}</span><strong className={Math.abs(gain)>.8?"notice":""}>{gain>0?"+":""}{gain.toFixed(1)} dB</strong></div>})}</div>
      <div className="conflict-advice"><AlertTriangle size={18}/><div><strong>{en?"Level suggestions are diagnostic only.":"Pegelhinweise dienen nur der Diagnose."}</strong><span>{en?"Arrangement, genre and sequencing still matter. This tool does not render or overwrite masters.":"Arrangement, Genre und Reihenfolge bleiben wichtig. Das Tool rendert oder überschreibt keine Master."}</span></div></div>
    </div>}
  <ToolJourney mode="recommendations" tool="album-consistency" lang={lang} busy={busy} complete={allComplete} incomplete={!busy && tracks.some(t => !!t.error)} error={error} progress={(en ? "Measuring pending track " : "Ausstehender Track wird gemessen: ") + progress} analysis={null} onRetry={() => void analyze()}/>
</section>;
}
