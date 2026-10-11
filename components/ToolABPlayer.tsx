"use client";
import { useEffect, useRef, useState } from "react";
import type { AnalysisData,Lang } from "@/lib/types/mastering";

export default function ToolABPlayer({a,b,aAnalysis,bAnalysis,lang}:{a:File;b:File;aAnalysis:AnalysisData;bAnalysis:AnalysisData;lang:Lang}) {
  const refs=useRef<(HTMLAudioElement|null)[]>([null,null]),context=useRef<AudioContext|null>(null),gains=useRef<GainNode[]>([]),activeRef=useRef(0),starting=useRef(false);
  const [urls,setUrls]=useState<string[]>([]),[active,setActive]=useState(0),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[error,setError]=useState("");
  const en=lang==="en", duration=Math.min(aAnalysis.duration_seconds,bAnalysis.duration_seconds);
  // One shared target and a ceiling for both tracks: never favor the louder one.
  const target=Math.min(aAnalysis.integrated_lufs,bAnalysis.integrated_lufs,aAnalysis.integrated_lufs-1-aAnalysis.true_peak,bAnalysis.integrated_lufs-1-bAnalysis.true_peak);
  const trims=[target-aAnalysis.integrated_lufs,target-bAnalysis.integrated_lufs];
  useEffect(()=>{const next=[URL.createObjectURL(a),URL.createObjectURL(b)];setUrls(next);return()=>{next.forEach(url=>URL.revokeObjectURL(url));for(const audio of refs.current)audio?.pause();void context.current?.close();context.current=null;gains.current=[];};},[a,b]);
  async function toggle() {
    if(starting.current)return;const audio=refs.current[activeRef.current];if(!audio)return;
    if(playing){audio.pause();setPlaying(false);return;}
    starting.current=true;setError("");
    try {
      if(!context.current){const ctx=new AudioContext();context.current=ctx;for(const element of refs.current){if(!element)throw Error("Player unavailable");const gain=ctx.createGain();ctx.createMediaElementSource(element).connect(gain).connect(ctx.destination);gains.current.push(gain);}}
      const ctx=context.current;gains.current.forEach((g,i)=>g.gain.setValueAtTime(Math.pow(10,trims[i]/20),ctx.currentTime));
      await ctx.resume();await audio.play();setPlaying(true);
    }catch{setError(en?"Playback unavailable. Please try again.":"Wiedergabe nicht verfügbar. Bitte erneut versuchen.");}
    finally{starting.current=false;}
  }
  async function select(index:number){if(starting.current||index===activeRef.current)return;const old=refs.current[activeRef.current],next=refs.current[index];const position=Math.min(old?.currentTime??time,Math.max(0,duration-.01));old?.pause();activeRef.current=index;setActive(index);if(next){next.currentTime=position;if(playing){try{await next.play();}catch{setPlaying(false);}}}}
  function seek(value:number){for(const audio of refs.current)if(audio)audio.currentTime=value;setTime(value);}
  return <div className="stream-player tool-ab-player">
    {urls.map((url,index)=><audio key={url} ref={node=>{refs.current[index]=node;}} src={url} preload="metadata" onEnded={()=>setPlaying(false)} onTimeUpdate={e=>{if(activeRef.current===index){setTime(e.currentTarget.currentTime);if(e.currentTarget.currentTime>=duration){e.currentTarget.pause();setPlaying(false);}}}}/>)}
    <div className="stream-ab"><button aria-pressed={playing} onClick={()=>void toggle()}>{playing?(en?"Pause":"Pausieren"):(en?"Play":"Abspielen")}</button><button className={active===0?"active":""} aria-pressed={active===0} onClick={()=>void select(0)}>A · {en?"Your track":"Dein Track"}</button><button className={active===1?"active":""} aria-pressed={active===1} onClick={()=>void select(1)}>B · {en?"Reference":"Referenz"}</button></div>
    <label>{en?"Position":"Position"} · {time.toFixed(1)} s<input type="range" min="0" max={Math.max(0,duration-.01)} step=".05" value={Math.min(time,duration)} onChange={e=>seek(Number(e.target.value))}/></label>
    <p>{en?"Loudness-matched playback with shared peak headroom. Original files are unchanged.":"Lautheitsangepasste Wiedergabe mit gemeinsamer Peak-Reserve. Originaldateien bleiben unverändert."} A {trims[0].toFixed(1)} dB · B {trims[1].toFixed(1)} dB</p>
    {error&&<p role="alert">{error}</p>}
  </div>;
}
