"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import type { Lang } from "@/lib/types/mastering";
import { decodeAudio } from "@/lib/clientAudio";
import { createAudioCut } from "@/lib/audioCut";
import { waveformPeaksAsync } from "@/lib/audioWorker";
import { toolError } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import { receiveReleaseFile } from "@/lib/releaseHandoff";
import { drawVisualizer,renderVisualizer } from "@/lib/visualizerVideo";
import { downloadToolBlob,ToolError,ToolPanel } from "./ToolPanel";
import styles from "./release-tools.module.css";

export default function AudioVisualizer({lang}: {lang:Lang}) {
  const en=lang==="en",t=(de:string,english:string)=>en?english:de;
  const canvas=useRef<HTMLCanvasElement>(null),alive=useRef(true),revision=useRef(0);
  const cutter=useToolJob();
  const [source,setSource]=useState<AudioBuffer>();
  const [master,setMaster]=useState<AudioBuffer>();
  const [cover,setCover]=useState<ImageBitmap>();
  const [coverLoading,setCoverLoading]=useState(false);
  const [name,setName]=useState("");
  const [title,setTitle]=useState("");
  const [start,setStart]=useState(0);
  const [length,setLength]=useState(15);
  const [busy,setBusy]=useState<"decode"|"render">();
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState("");
  const [preview,setPreview]=useState<{blob:Blob;url:string}>();
  const [waves,setWaves]=useState<{a:Float32Array;b?:Float32Array}>();
  const limit=Math.min(30,(Math.min(source?.duration??0,master?.duration??Infinity)-start));
  const duration=Math.min(length, limit);
  const visual=useMemo(()=>({title:title||t("Dein Track","Your track"),cover,peaks:waves?.a??new Float32Array(96),altPeaks:master?(waves?.b??new Float32Array(96)):undefined,en}),[title,cover,waves,master,en]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url);},[preview]);
  useEffect(()=>()=>{cover?.close();},[cover]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;revision.current++;};},[]);
  useEffect(()=>{const file=receiveReleaseFile("audio-visualizer");if(file)void readAudio(file);},[]);
  useEffect(()=>{if(!busy&&canvas.current)drawVisualizer(canvas.current,visual);},[visual,busy]);
  useEffect(()=>{
    if(!source||duration<1){setWaves(undefined);return;}
    const request=new AbortController();
    const timer=window.setTimeout(async()=>{
      try {
        const a=await waveformPeaksAsync(createAudioCut(source,start,start+duration,0,0),request.signal);
        const b=master?await waveformPeaksAsync(createAudioCut(master,start,start+duration,0,0),request.signal):undefined;
        if(!request.signal.aborted)setWaves({a,b});
      } catch { /* Export recomputes its own selected waveform. */ }
    },180);
    return()=>{request.abort();window.clearTimeout(timer);};
  },[source,master,start,duration]);
  async function readAudio(file:File,alt=false) {
    const task=cutter.start();setBusy("decode");setError("");setPreview(undefined);
    try{
      if(file.size>40*1024*1024)throw Error("SIZE");
      const audio=await decodeAudio(file);
      if(!cutter.active(task))return;
      if(audio.duration<1||audio.duration>600)throw Error("DURATION");
      setStart(0);setLength(Math.min(15,Math.floor(audio.duration)));
      if(alt)setMaster(audio);
      else {const base=file.name.replace(/\.[^.]+$/,"");setSource(audio);setTitle(base.slice(0,78));setName(base);}
    }catch(reason){if(cutter.active(task))setError(toolError(reason,lang));}
    finally{if(cutter.active(task))setBusy(undefined);}
  }

  async function readCover(file:File){
    const ticket=++revision.current;setCoverLoading(true);setError("");setPreview(undefined);
    try{
      if(file.size>10*1024*1024||!/\.(png|jpe?g|webp)$/i.test(file.name))throw Error("COVER");
      const image=await createImageBitmap(file);
      if(!alive.current||revision.current!==ticket){image.close();return;}
      if(image.width*image.height>20_000_000){image.close();throw Error("COVER");}
      setCover(image);
    }catch{if(alive.current&&revision.current===ticket)setError(t("Cover als JPG, PNG oder WebP bis 10 MB und 20 Megapixel wählen.","Use JPG, PNG or WebP cover art up to 10 MB and 20 megapixels."));}
    finally { if(alive.current&&revision.current===ticket)setCoverLoading(false); }
  }

  async function render(){
    if(!canvas.current||!source||duration<1)return;
    const target=canvas.current, task=cutter.start();
    setBusy("render");setProgress(0);setError("");setPreview(undefined);
    try{
      const a=await waveformPeaksAsync(createAudioCut(source,start,start+duration,0,0),task.signal);
      const b=master?await waveformPeaksAsync(createAudioCut(master,start,start+duration,0,0),task.signal):undefined;
      const compact=(bins:Float32Array)=>Float32Array.from({length:136},(_,i)=>bins[Math.round(i*(bins.length-1)/135)]);
      const blob=await renderVisualizer(target,source,master,start,duration,{...visual,peaks:compact(a),altPeaks:b?compact(b):undefined},task.signal,setProgress);
      if(cutter.active(task))setPreview({blob,url:URL.createObjectURL(blob)});
    }catch(reason){
      if(cutter.active(task))setError(reason instanceof Error&&reason.message==="VIDEO_UNSUPPORTED"?t("Videoexport wird in diesem Browser nicht unterstützt.","This browser does not support video export."):toolError(reason,lang));
    }finally{if(cutter.active(task))setBusy(undefined);}
  }
  return <ToolPanel>
    <div className={styles.videoLayout}>
      <div>
        <label>{t("Original oder Song","Original or song")}<input type="file" accept="audio/*,.wav,.aiff,.flac" disabled={!!busy} onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void readAudio(f);}}/></label>
        <label>{t("Master für A/B-Wechsel (optional)","Master for A/B switch (optional)")}<input type="file" accept="audio/*,.wav,.aiff,.flac" disabled={!!busy||!source}
          onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void readAudio(f,true);}}/></label>
        {master&&<button disabled={!!busy} onClick={()=>{setMaster(undefined);setPreview(undefined);}}>{t("Master entfernen","Remove master")}</button>}
        <label>{t("Cover (optional)","Cover art (optional)")}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy}
          onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void readCover(f);}}/></label>
        {cover&&<button disabled={!!busy||coverLoading} onClick={()=>{revision.current++;setCover(undefined);setPreview(undefined);}}>{t("Cover entfernen","Remove cover")}</button>}
        <label>{t("Titel im Video","Video title")}<input maxLength={78} value={title} disabled={!!busy} onChange={e=>{setTitle(e.target.value);setPreview(undefined);}}/></label>
        <div className={styles.grid}>
          <label>{t("Start (Sekunden)","Start (seconds)")}<input type="number" min="0" max={Math.max(0,Math.min(source?.duration??0,master?.duration??Infinity)-1)} step=".1" value={start} disabled={!!busy||!source}
            onChange={e=>{setStart(Math.min(Math.max(0,Math.min(source?.duration??0,master?.duration??Infinity)-1),Math.max(0,+e.target.value)));setPreview(undefined);}}/></label>
          <label>{t("Länge (Sekunden)","Length (seconds)")}<input type="number" min="1" max="30" value={length} disabled={!!busy||!source}
            onChange={e=>{setLength(Math.min(30,Math.max(1,+e.target.value)));setPreview(undefined);}}/></label>
        </div>
        <p className={styles.hint}>{t("720 × 1280 · bis 30 Sekunden · lokaler Export in Echtzeit. MP4 oder WebM je nach Browser.", "720 × 1280 · up to 30 seconds · local real-time export. MP4 or WebM, depending on your browser.")}</p>
        {source&&<p>{t("Ausschnitt","Excerpt")} {start.toFixed(1)}–{(start+duration).toFixed(1)} s {master&&t("· Wechsel in der Mitte","· switch at the midpoint")}</p>}
        <button data-action disabled={!!busy||coverLoading||!source||duration<1} onClick={()=>void render()}>{busy==="render"?t("Video wird aufgenommen …","Recording video…"):t("Video erstellen","Make video")}</button>
        {busy==="render"&&<><progress aria-label={t("Exportfortschritt","Export progress")} max={1} value={progress}/><button onClick={()=>{cutter.cancel();setBusy(undefined);}}>{t("Abbrechen","Cancel")}</button></>}
        <ToolError>{error}</ToolError>
      </div>
      <div>
        <canvas ref={canvas} width={720} height={1280} hidden={!!preview} className={styles.canvas} aria-label={t("Videovorschau","Video preview")}/>
        {preview&&<><video className={styles.video} src={preview.url} controls playsInline/><button data-action onClick={()=>downloadToolBlob(preview.blob,(name||"beatzucker")+"-short."+(preview.blob.type.includes("mp4")?"mp4":"webm"))}>{t("Video herunterladen","Download video")}</button></>}
      </div>
    </div>
  </ToolPanel>;
}
