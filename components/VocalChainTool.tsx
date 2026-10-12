"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { ArrowLeft,CheckCircle2,Download,Loader2,Mic2,Pause,Play,SlidersHorizontal,UploadCloud } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import { decodeAudio,samplePeak,checkResampleBudget } from "@/lib/clientAudio";
import { encodeWavAsync } from "@/lib/audioWorker";
import { toolError } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import { buildVocalGraph,VOCAL_DEFAULT,VOCAL_PRESETS,type VocalGraph,type VocalParams } from "@/lib/vocalAudio";
import ToolLanguageNav from "./ToolLanguageNav";
import ToolJourney from "./ToolJourney";

export default function VocalChainTool({lang}:{lang:Lang}) {
  const en=lang==="en",input=useRef<HTMLInputElement>(null),context=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),graph=useRef<VocalGraph|null>(null),starting=useRef(false),job=useToolJob();
  const [file,setFile]=useState<File|null>(null),[buffer,setBuffer]=useState<AudioBuffer|null>(null),[params,setParams]=useState(VOCAL_DEFAULT),[preset,setPreset]=useState("Clean"),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[download,setDownload]=useState(""),[protect,setProtect]=useState(true),[correction,setCorrection]=useState<number|null>(null),[peak,setPeak]=useState<number|null>(null);
  function stop() {starting.current=false;const s=source.current;source.current=null;if(s){s.onended=null;try{s.stop();}catch{}}graph.current?.dispose();graph.current=null;setPlaying(false);setPeak(null);}
  useEffect(()=>()=>{starting.current=false;if(source.current){source.current.onended=null;try{source.current.stop();}catch{}}graph.current?.dispose();void context.current?.close();},[]);
  useEffect(()=>()=>{if(download)URL.revokeObjectURL(download);},[download]);
  useEffect(()=>{if(!playing)return;const samples=new Float32Array(2048);const timer=setInterval(()=>{if(!graph.current)return;graph.current.meter.getFloatTimeDomainData(samples);let p=0;for(const v of samples)p=Math.max(p,Math.abs(v));setPeak(p?20*Math.log10(p):-100);},150);return()=>clearInterval(timer);},[playing]);
  function invalidate(){setDownload("");setCorrection(null);}
  async function load(f:File) {
    if(busy||starting.current)return;stop();const task=job.start();setBusy(true);setError("");invalidate();
    try {const decoded=await decodeAudio(f);checkResampleBudget(decoded,decoded.sampleRate);if(!job.active(task))return;setBuffer(decoded);setFile(f);}
    catch(reason){if(job.active(task))setError(toolError(reason,lang));}finally{setBusy(false);}
  }
  async function toggle() {
    if(!buffer||starting.current||busy)return;if(playing){stop();return;}starting.current=true;setError("");
    try {
      if(!context.current||context.current.state==="closed")context.current=new AudioContext();
      const ctx=context.current;await ctx.resume();if(!starting.current)return;
      const s=ctx.createBufferSource();s.buffer=buffer;const g=await buildVocalGraph(ctx,s,params,buffer.numberOfChannels);
      if(!starting.current){g.dispose();return;}graph.current=g;source.current=s;
      s.onended=()=>{if(source.current===s){source.current=null;g.dispose();graph.current=null;setPlaying(false);setPeak(null);}};
      s.start();setPlaying(true);
    }catch(reason){stop();setError(toolError(reason,lang));}finally{starting.current=false;}
  }
  function update(next:VocalParams,name="Custom"){if(busy)return;setParams(next);setPreset(name);graph.current?.apply(next);invalidate();}
  async function render() {
    if(!buffer||!file||busy)return;stop();const task=job.start();setError("");setBusy(true);invalidate();
    let g:VocalGraph|null=null;
    try {
      checkResampleBudget(buffer,buffer.sampleRate);
      const offline=new OfflineAudioContext(buffer.numberOfChannels,buffer.length,buffer.sampleRate),s=offline.createBufferSource();s.buffer=buffer;
      g=await buildVocalGraph(offline,s,params,buffer.numberOfChannels);s.start();const rendered=await offline.startRendering();
      if(!job.active(task))return;
      const p=samplePeak(rendered),ceiling=Math.pow(10,-1/20),gain=protect&&p>ceiling?ceiling/p:1;
      if(!protect&&p>1)throw Error("OVERLOAD");
      if(gain<1)for(let ch=0;ch<rendered.numberOfChannels;ch++){const data=rendered.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=gain;}
      const blob=await encodeWavAsync(rendered,"24",true);if(!job.active(task))return;
      setCorrection(20*Math.log10(gain));setDownload(URL.createObjectURL(blob));
    }catch(reason){if(job.active(task))setError(toolError(reason,lang));}finally{g?.dispose();setBusy(false);}
  }
  const controls:[keyof VocalParams,string,string,number,number,number][]=[["hpf",en?"High-pass":"Hochpass","Hz",40,180,1],["deess",en?"De-esser":"De-Esser","%",0,100,1],["comp",en?"Compression":"Kompression","%",0,100,1],["presence",en?"Presence":"Präsenz","dB",-4,4,.1],["air",en?"Air":"Höhen","dB",-4,4,.1],["output",en?"Output":"Ausgang","dB",-8,4,.1]];
  return <section className="stream-tool">
    <Link href={en?"/en/tools":"/tools"} className="tool-back"><ArrowLeft size={15}/>{en?"All tools":"Alle Tools"}</Link><ToolLanguageNav lang={lang}/>
    <div className="stream-hero"><span><Mic2 size={14}/> VOCAL CHAIN</span><h1>{en?<>Polish vocals with <em>instant feedback.</em></>:<>Veredle Vocals mit <em>direktem Feedback.</em></>}</h1><p>{en?"Real-time vocal processing with a protected WAV export.":"Echtzeit-Bearbeitung für Vocals mit geschütztem WAV-Export."}</p></div>
    <input ref={input} hidden disabled={busy} type="file" accept="audio/*,.wav,.flac,.mp3,.aiff,.aif" onChange={e=>{const f=e.target.files?.[0];if(f)void load(f);e.target.value="";}}/>
    {!buffer&&<button className="stream-upload" disabled={busy} onClick={()=>input.current?.click()}><div>{busy?<Loader2 className="mixcheck-spin"/>:<UploadCloud/>}</div><h2>{en?"Choose a vocal or a cappella":"Vocal oder A-cappella auswählen"}</h2><p>{en?"Browser-supported audio · up to 80 MB":"Browser-unterstütztes Audio · bis 80 MB"}</p></button>}

    <ToolJourney mode="feedback" tool="vocal-chain" lang={lang} busy={busy} complete={!!download} incomplete={false} error={error} progress={buffer ? (en ? "Rendering your vocal chain …" : "Deine Vocal Chain wird gerendert …") : (en ? "Decoding vocals …" : "Vocals werden dekodiert …")} analysis={null}/>
    {buffer&&<div className="stream-console vocal-console" aria-busy={busy}>
      <div className="vocal-transport"><button disabled={busy} aria-label={playing?(en?"Pause":"Pausieren"):(en?"Play processed vocals":"Bearbeitete Vocals abspielen")} onClick={()=>void toggle()}>{playing?<Pause/>:<Play/>}</button><div><strong>{file?.name}</strong><span>{en?"Live controls · de-esser and compressor bypass at 0%":"Live-Regler · De-Esser und Kompressor bei 0 % aus"}</span></div><button disabled={busy} className="vocal-reset" onClick={()=>update(VOCAL_DEFAULT,"Clean")}>{en?"Reset chain":"Chain zurücksetzen"}</button></div>
      {playing&&<p role="status" className={peak!==null&&peak>=0?"mixcheck-error":"stream-note"}>{en?"Live mono-sum sample peak: ":"Live-Sample-Peak der Monosumme: "}{peak?.toFixed(1)??"—"} dBFS {peak!==null&&peak>=0&&(en?"— reduce output gain.":"– Ausgangspegel senken.")}</p>}
      <div className="vocal-presets">{Object.entries(VOCAL_PRESETS).map(([name,value])=><button key={name} disabled={busy} className={preset===name?"active":""} onClick={()=>update(value,name)}>{name}</button>)}</div>
      <div className="vocal-rack">{controls.map(([key,label,unit,min,max,step])=><label key={key}><span><b>{label}</b><em>{params[key].toFixed(step<1?1:0)} {unit}</em></span><input type="range" disabled={busy} min={min} max={max} step={step} value={params[key]} onChange={e=>update({...params,[key]:Number(e.target.value)})}/></label>)}</div>
      <label className="tool-option"><input type="checkbox" checked={protect} disabled={busy} onChange={e=>{setProtect(e.target.checked);invalidate();}}/>{en?"Protect export: lower gain if sample peaks exceed −1 dBFS":"Export schützen: Pegel bei Sample-Spitzen über −1 dBFS absenken"}</label>
      {correction!==null&&<p role="status">{en?"Export gain correction: ":"Pegelkorrektur beim Export: "}{correction.toFixed(2)} dB. {en?"No limiter; intersample peaks may differ.":"Kein Limiter; Zwischen-Sample-Spitzen können abweichen."}</p>}
      {download?<a className="converter-download" href={download} download={(file?.name.replace(/\.[^.]+$/,"")||"vocal")+"-vocal-chain.wav"}><Download size={18}/>{en?"Download processed WAV":"Bearbeitete WAV herunterladen"}</a>:<button className="conflict-run" disabled={busy} onClick={()=>void render()}>{busy?<Loader2 className="mixcheck-spin"/>:<SlidersHorizontal size={18}/>} {en?"Render 24-bit WAV":"24-Bit-WAV rendern"}</button>}
      {busy&&<button className="tool-back" onClick={()=>{job.cancel();}}>{en?"Discard result":"Ergebnis verwerfen"}</button>}
      <button className="tool-back" disabled={busy} onClick={()=>input.current?.click()}>{en?"Choose another file":"Andere Datei wählen"}</button>
      <p className="stream-honesty"><CheckCircle2 size={14}/>{en?"Preview and export use the same zero-lookahead, stereo-linked dynamics and EQ. Export protection can lower the whole file, without clipping samples or changing dynamics.":"Vorschau und Export verwenden dieselbe verzögerungsfreie, stereogekoppelte Dynamikbearbeitung und denselben EQ. Der Exportschutz senkt bei Bedarf die ganze Datei ab, ohne Samples abzuschneiden oder die Dynamik zu verändern."}</p>
    </div>}
  <ToolJourney mode="recommendations" tool="vocal-chain" lang={lang} busy={busy} complete={!!download} incomplete={false} error={error} progress={buffer ? (en ? "Rendering your vocal chain …" : "Deine Vocal Chain wird gerendert …") : (en ? "Decoding vocals …" : "Vocals werden dekodiert …")} analysis={null}/>
</section>;
}
