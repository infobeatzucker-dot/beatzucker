"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types/mastering";
import { decodeAudio } from "@/lib/clientAudio";
import { toolError } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import { LabDelivery } from "@/components/mastering-lab/LabDelivery";
import { labWorkletUrl } from "@/components/mastering-lab/audio";
import { neutral } from "@/components/mastering-lab/settings";
import { ToolPanel, ToolError } from "./ToolPanel";
import styles from "./release-tools.module.css";
import labStyles from "@/components/mastering-lab/lab.module.css";
import { getUiTheme } from "@/lib/uiTheme";
import type { CSSProperties } from "react";

type Stem = {file: File; buffer: AudioBuffer};
type Controls = {duckDepth:number;duckThreshold:number;duckRelease:number;duckDetectorFrequency:number};
const presets = [
  {id:"edm", title:"EDM / Club", duckDepth:3, duckThreshold:-31, duckRelease:140, duckDetectorFrequency:150},
  {id:"techno", title:"Techno", duckDepth:2.5, duckThreshold:-31, duckRelease:95, duckDetectorFrequency:135},
  {id:"trap", title:"Trap / 808", duckDepth:2, duckThreshold:-28, duckRelease:175, duckDetectorFrequency:135},
];
const fields = [
  ["duckDepth", "Absenkung (dB)", "Duck depth (dB)", 0, 8, .1],
  ["duckThreshold", "Kick-Schwelle (dBFS)", "Kick threshold (dBFS)", -50, -12, 1],
  ["duckRelease", "Rückkehr (ms)", "Recovery (ms)", 50, 380, 1],
  ["duckDetectorFrequency", "Kick-Detektor (Hz)", "Kick detector (Hz)", 50, 250, 1],
] as const;
function makeProcessor(ctx: BaseAudioContext, controls: Controls, channels: number, meters: boolean) {
  return new AudioWorkletNode(ctx, "kick-bass-stems", { numberOfInputs:2, numberOfOutputs:1, outputChannelCount:[channels],
    processorOptions:{settings:controls,meters} });
}
async function renderBass(kick: AudioBuffer, bass: AudioBuffer, controls: Controls) {
  const ctx = new OfflineAudioContext(bass.numberOfChannels, bass.length, bass.sampleRate);
  await ctx.audioWorklet.addModule(labWorkletUrl);
  const detector = makeProcessor(ctx,controls,bass.numberOfChannels,false);
  const kickNode=ctx.createBufferSource(),bassNode=ctx.createBufferSource();
  kickNode.buffer=kick;bassNode.buffer=bass;
  kickNode.connect(detector,0,0);bassNode.connect(detector,0,1);detector.connect(ctx.destination);
  kickNode.start();bassNode.start();
  try { return await ctx.startRendering(); }
  finally { detector.port.close(); }
}

type Monitor = {
  node: AudioWorkletNode; kick: AudioBufferSourceNode; bass: AudioBufferSourceNode;
  dry: GainNode; wet: GainNode; reference: GainNode;
};
const theme=getUiTheme("midnight-cobalt");
const labTheme={"--lab-bg":theme.bg,"--lab-panel":theme.panel,"--lab-inset":theme.inset,"--lab-muted":theme.muted,
  "--lab-line":theme.line,"--lab-text":theme.text,"--lab-accent":theme.accent,"--lab-second":theme.second} as CSSProperties;

export default function StemSidechain({lang}: {lang:Lang}) {
  const t=(de:string,en:string)=>lang==="en"?en:de;
  const job=useToolJob(), graph=useRef<Monitor | null>(null),context=useRef<AudioContext | null>(null),epoch=useRef(0);
  const [kick,setKick]=useState<Stem>(),[bass,setBass]=useState<Stem>();
  const [controls,setControls]=useState<Controls>(presets[0]);
  const [preset,setPreset]=useState("edm");
  const [mode,setMode]=useState<"original"|"wet">("wet");
  const [withKick,setWithKick]=useState(true);
  const [loop,setLoop]=useState(true);
  const [busy,setBusy]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [error,setError]=useState("");
  const [reduction,setReduction]=useState({gain:1,triggers:0});
  const routing=useRef({mode,withKick});
  routing.current={mode,withKick};
  const duration=kick&&bass?Math.min(kick.buffer.duration,bass.buffer.duration):0;
  const [offset,setOffset]=useState(0);

  function stop() {
    epoch.current++;
    const active=graph.current;
    graph.current=null;
    if(active){
      active.bass.onended=null;
      active.kick.stop();active.bass.stop();
      active.kick.disconnect();active.bass.disconnect();
      active.node.port.close();active.node.disconnect();
      active.dry.disconnect();active.wet.disconnect();active.reference.disconnect();
    }
    setPlaying(false);setReduction({gain:1,triggers:0});
  }
  useEffect(()=>()=>{stop();const ctx=context.current;context.current=null;if(ctx)void ctx.close();},[]);
  useEffect(()=>{graph.current?.node.port.postMessage(controls);},[controls]);
  useEffect(()=>{
    const active=graph.current;
    if(!active)return;
    const now=active.dry.context.currentTime;
    active.dry.gain.setTargetAtTime(mode==="original"?.5:0,now,.01);
    active.wet.gain.setTargetAtTime(mode==="wet"?.5:0,now,.01);
    active.reference.gain.setTargetAtTime(withKick?.5:0,now,.01);
  },[mode,withKick]);

  async function load(file:File,isKick:boolean) {
    stop();setError("");setBusy(true);const task=job.start();
    try {
      if(file.size>40*1024*1024)throw Error("SIZE");
      const buffer=await decodeAudio(file);
      if(!job.active(task))return;
      if(buffer.duration<.1||buffer.duration>600)throw Error("DURATION");
      const next={file,buffer};
      if(isKick)setKick(next);else setBass(next);
      setOffset(0);
    }catch(reason){if(job.active(task))setError(toolError(reason,lang));}
    finally{if(job.active(task))setBusy(false);}
  }

  async function play() {
    if(playing){stop();return;}
    if(!kick||!bass)return;
    const ticket=++epoch.current;
    setError("");
    try {
      const ctx=context.current??=new AudioContext();
      await ctx.resume();
      await ctx.audioWorklet.addModule(labWorkletUrl);
      if(ticket!==epoch.current||graph.current)return;
      const node=makeProcessor(ctx,controls,bass.buffer.numberOfChannels,true);
      const kickNode=ctx.createBufferSource(),bassNode=ctx.createBufferSource();
      const dry=ctx.createGain(),wet=ctx.createGain(),reference=ctx.createGain();
      kickNode.buffer=kick.buffer;bassNode.buffer=bass.buffer;
      const route=routing.current;
      dry.gain.value=route.mode==="original"?.5:0;
      wet.gain.value=route.mode==="wet"?.5:0;
      reference.gain.value=route.withKick?.5:0;
      kickNode.connect(node,0,0);kickNode.connect(reference).connect(ctx.destination);
      bassNode.connect(node,0,1);bassNode.connect(dry).connect(ctx.destination);
      node.connect(wet).connect(ctx.destination);
      node.port.onmessage=({data})=>{ if(graph.current?.node===node)setReduction(data); };
      const when=ctx.currentTime+.025;
      [kickNode,bassNode].forEach(source=>{
        if(loop){source.loop=true;source.loopStart=offset;source.loopEnd=duration;source.start(when,offset);}
        else source.start(when,offset,duration-offset);
      });
      graph.current={node,kick:kickNode,bass:bassNode,dry,wet,reference};
      bassNode.onended=()=>{if(graph.current?.node===node)stop();};
      setPlaying(true);
    }catch(reason){ if(ticket===epoch.current)setError(toolError(reason,lang)); }
  }

  return <div className={styles.page}>
    <h1>{t("Kick & Bass mit getrennten Spuren","Kick & bass with separate stems")}</h1>
    <ToolPanel>
      <div className={styles.grid}>
        <label>{t("Kickspur · Trigger","Kick stem · trigger")}<input type="file" accept="audio/*,.wav,.aiff,.flac" disabled={busy} onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void load(f,true);}}/></label>
        <label>{t("Bassspur · Bearbeitung","Bass stem · processing")}<input type="file" accept="audio/*,.wav,.aiff,.flac" disabled={busy} onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void load(f,false);}}/></label>
      </div>
      <p className={styles.hint}>{t("Beide Spuren müssen am selben Zeitnullpunkt beginnen. Die Kick triggert die Absenkung der gesamten Bassspur. Der Export enthält nur den bearbeiteten Bass.", "Use stems with the same time zero. The kick triggers ducking on the whole bass stem. The export contains only the processed bass.")}</p>
      {kick&&bass&&duration>0&&<>
        <label>Preset <select aria-label="Preset" value={preset} onChange={e=>{
          const next=presets.find(item=>item.id===e.target.value); if(next){setPreset(next.id);setControls(next);}
        }}>{preset==="custom"&&<option value="custom">{t("Angepasst","Adjusted")}</option>}{presets.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <div className={styles.grid}>{fields.map(([key,de,en,min,max,step])=><label key={key}>{t(de,en)}
          <input aria-label={t(de,en)} type="range" min={min} max={max} step={step} value={controls[key]} onChange={e=>{setPreset("custom");setControls(old=>({...old,[key]:+e.target.value}));}}/><output>{controls[key]}</output>
        </label>)}</div>
        <div className={styles.row}>
          <button data-action onClick={()=>void play()}>{playing?t("Stoppen","Stop"):t("Abspielen","Play")}</button>
          <button aria-pressed={loop} onClick={()=>{stop();setLoop(!loop);}}>Loop</button>
          <button aria-pressed={withKick} onClick={()=>setWithKick(!withKick)}>{t("Kick mithören","Monitor kick")}</button>
          <button aria-pressed={mode==="original"} onClick={()=>setMode("original")}>A · {t("Originalbass","Original bass")}</button>
          <button aria-pressed={mode==="wet"} onClick={()=>setMode("wet")}>B · {t("Bearbeiteter Bass","Processed bass")}</button>
        </div>
        <label>{t("Vorschaustart (Sekunden)","Preview start (seconds)")}<input type="range" min="0" max={Math.max(0,duration-.1)} step=".05" value={offset} onChange={e=>{stop();setOffset(+e.target.value);}}/>{offset.toFixed(2)} s</label>
        <dl className={styles.metrics}><div><dt>{t("Bass-Absenkung","Bass reduction")}</dt><dd>{(20*Math.log10(reduction.gain)).toFixed(1)} dB</dd></div>
          <div><dt>{t("Kick-Impulse","Kick hits")}</dt><dd>{reduction.triggers}</dd></div></dl>
        <p className={styles.hint}>{t("Die Vorschau mischt Kick und Bass mit Pegelreserve. Der Bass-Export verwendet seine eigenen Pegel.", "The preview mixes kick and bass with headroom. Bass export uses its own levels.")}</p>
      </>}
      {busy&&<p role="status">{t("Spur wird gelesen …","Reading stem…")}</p>}
      <ToolError>{error}</ToolError>
    </ToolPanel>
    <div className={labStyles.lab} style={{...labTheme,padding:0,minHeight:0,background:"transparent"}}>
      <LabDelivery lang={lang} sidechain source={kick&&bass?.file} buffer={kick&&bass?.buffer} settings={neutral} target={null}
        onTarget={()=>{}} onProfile={()=>{}}
        renderAudio={kick&&bass?()=>renderBass(kick.buffer,bass.buffer,controls):undefined}/>
    </div>
  </div>;
}
