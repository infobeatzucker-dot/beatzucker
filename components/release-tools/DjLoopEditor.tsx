"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/types/mastering";
import { decodeAudio } from "@/lib/clientAudio";
import { encodeWavAsync, waveformPeaksAsync } from "@/lib/audioWorker";
import { barLength, createDjLoop } from "@/lib/djLoop";
import { tapTempo, toolError } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import { downloadToolBlob, ToolError, ToolPanel } from "./ToolPanel";
import { useAudioTransport } from "./useAudioTransport";
import styles from "./release-tools.module.css";

export default function DjLoopEditor({lang}: {lang: Lang}) {
  const t = (de: string, en: string) => lang === "en" ? en : de;
  const job=useToolJob();
  const [source,setSource]=useState<{file:File; audio:AudioBuffer; peaks:Float32Array}>();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [start,setStart]=useState(0);
  const [bpm,setBpm]=useState(128);
  const [bpmText,setBpmText]=useState("128");
  const [bars,setBars]=useState(4);
  const [beats,setBeats]=useState(4);
  const [repeat,setRepeat]=useState(1);
  const [seam,setSeam]=useState(true);
  const [taps,setTaps]=useState<number[]>([]);
  const [excerpt,setExcerpt]=useState<AudioBuffer>();
  const length=barLength(bpm,bars,beats);
  const fits=source && start+length <= source.audio.duration+.000001;
  const tracks=useMemo(()=>excerpt ? [{buffer:excerpt}] : [],[excerpt]);
  const player=useAudioTransport(tracks,excerpt?.duration ?? 0);
  useEffect(()=>{
    if (!source || !fits) { setExcerpt(undefined);return; }
    setExcerpt(undefined);
    const timer=window.setTimeout(()=>{
      try { setExcerpt(createDjLoop(source.audio,start,length,1,seam?.003:0)); }
      catch { setExcerpt(undefined); }
    },120);
    return()=>window.clearTimeout(timer);
  },[source,fits,start,length,seam]);
  async function open(file:File) {
    const task=job.start();setError("");setBusy(true);setSource(undefined);
    try {
      const audio=await decodeAudio(file);
      const peaks=await waveformPeaksAsync(audio,task.signal);
      if (!job.active(task)) return;
      setStart(0);setRepeat(1);setSource({file,audio,peaks});
      const available=[32,16,8,4,2,1].filter(b=>b<=4).find(n=>barLength(bpm,n,beats)<=audio.duration);
      if (available) setBars(available);
    } catch(reason) { if(job.active(task))setError(toolError(reason,lang)); }
    finally { if(job.active(task))setBusy(false); }
  }
  async function save() {
    if(!source || !fits)return;
    player.stop();const task=job.start();setBusy(true);setError("");
    try {
      const output=createDjLoop(source.audio,start,length,repeat,seam?.003:0);
      const wav=await encodeWavAsync(output,"24",true,task.signal);
      if(job.active(task))downloadToolBlob(wav,source.file.name.replace(/\.[^.]+$/,"")+(repeat===1?"-loop.wav":"-dj-edit.wav"));
    } catch(reason) { if(job.active(task))setError(toolError(reason,lang)); }
    finally { if(job.active(task))setBusy(false); }
  }
  return <ToolPanel>
    <label>{t("Track laden","Load a track")}<input type="file" accept="audio/*,.wav,.flac,.aiff,.mp3" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void open(file);}}/></label>
    <p className={styles.hint}>{t("Der Schnitt läuft lokal. Stelle den Start auf den ersten tatsächlich hörbaren Schlag.", "Processing runs locally. Place the start on the first audible downbeat.")}</p>
    {source && <>
      <svg className={styles.wave} viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"
        onPointerDown={e => {
          if (busy) return;
          const bounds=e.currentTarget.getBoundingClientRect();
          setStart(Math.min(Math.max(0,source.audio.duration-length),Math.max(0,(e.clientX-bounds.left)/bounds.width*source.audio.duration)));
        }}>
        <rect x={400*start/source.audio.duration} width={400*Math.min(length, source.audio.duration-start)/source.audio.duration} height="100" fill="currentColor" opacity=".18"/>
        {Array.from(source.peaks,(peak,i) => <line key={i} x1={400*i/source.peaks.length} x2={400*i/source.peaks.length} y1={50-45*peak} y2={50+45*peak}/>)}
        {player.playing && <line x1={400*(start+player.position)/source.audio.duration} x2={400*(start+player.position)/source.audio.duration} y1="0" y2="100" style={{stroke:"white"}}/>}
      </svg>
      <div className={styles.grid}>
        <label>{t("Start (Sekunden)","Start (seconds)")}<input type="number" min={0} max={source.audio.duration} step=".001" value={Number(start.toFixed(3))} disabled={busy} onChange={e=>setStart(Math.min(source.audio.duration,Math.max(0,+e.target.value)))}/></label>
        <label>BPM<input type="number" min="40" max="240" step=".1" disabled={busy} value={bpmText} onChange={e=>{
          setBpmText(e.target.value);
          const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=40&&n<=240)setBpm(n);
        }} onBlur={()=>setBpmText(String(bpm))}/></label>
        <label>{t("Takte","Bars")}<select aria-label={t("Takte","Bars")} value={bars} disabled={busy} onChange={e=>setBars(+e.target.value)}>{[1,2,4,8,16,32].map(n=><option key={n}>{n}</option>)}</select></label>
        <label>{t("Schläge pro Takt","Beats per bar")}<select disabled={busy} value={beats} onChange={e=>setBeats(+e.target.value)}><option value="3">3</option><option value="4">4</option></select></label>
      </div>
      <div className={styles.row}>
        <button disabled={busy} onClick={()=>{
          const now=performance.now(), recent=taps.at(-1)??0, next=(now-recent>2500?[]:taps).concat(now).slice(-8);
          setTaps(next);const tempo=tapTempo(next);
          if(tempo>=40&&tempo<=240){const rounded=Math.round(tempo*10)/10;setBpm(rounded);setBpmText(String(rounded));}
        }}>{t("Tempo eintippen","Tap tempo")}</button>
        <button disabled={!excerpt||busy} aria-pressed={player.playing} onClick={()=>player.playing?player.stop():void player.play(true).catch(reason=>setError(toolError(reason,lang)))}>
          {player.playing?t("Loop stoppen","Stop loop"):t("Loop vorhören","Audition loop")}</button>
        <button disabled={busy} aria-pressed={seam} onClick={()=>setSeam(!seam)}>{t("Kurze Übergangsfades","Short seam fades")}</button>
      </div>
      <p role="status">{bars} {t("Takte","bars")} · {length.toFixed(3)} s · {t("Ende","End")} {(start+length).toFixed(3)} s</p>
      {!fits && <p>{t("Der Loop passt ab diesem Start nicht in den Track. Wähle weniger Takte oder einen früheren Start.", "The loop does not fit at this start. Choose fewer bars or an earlier start.")}</p>}
      <label>{t("Export","Export")}<select disabled={busy} value={repeat} onChange={e=>setRepeat(+e.target.value)}>
        <option value={1}>{t("Nur den Loop","Loop only")}</option>
        {[2,3,4,8].map(n=><option key={n} value={n}>{t("Ganzer DJ-Edit · Passage","Full DJ edit · passage")} ×{n}</option>)}
      </select></label>
      <button data-action disabled={!fits||busy} onClick={()=>void save()}>{t("WAV herunterladen","Download WAV")}</button>
    </>}
    {busy && <p role="status">{t("Datei wird verarbeitet …","Processing audio…")}</p>}
    <ToolError>{error}</ToolError>
  </ToolPanel>;
}
