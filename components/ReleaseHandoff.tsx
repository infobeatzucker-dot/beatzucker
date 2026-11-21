"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types/mastering";
import { AUDIO_RELEASE_TOOLS, releaseToolHref } from "@/lib/releaseTools";
import { offerReleaseFile, type HandoffTool } from "@/lib/releaseHandoff";
import styles from "./ListeningEntry.module.css";

const options: HandoffTool[] = ["release-check","mastering-blindtest","audio-visualizer"];

export default function ReleaseHandoff({ lang, filename, url, file }: {lang:Lang;filename:string;url?:string;file?:File}) {
  const en=lang==="en", router=useRouter();
  const request=useRef<AbortController | null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  useEffect(()=>{setBusy(false);setError(false);return()=>{request.current?.abort();request.current=null;};},[url,file]);
  const available=options.filter(tool=>tool==="release-check"? /\.(wav|mp3|aac|m4a)$/i.test(filename) : !file || file.size <=40*1024*1024);
  if ((!file && !url) || !available.length) return null;
  async function go(tool:HandoffTool) {
    if(request.current)return;
    const controller=new AbortController();
    request.current=controller;setBusy(true);setError(false);
    try {
      let audio=file;
      if(!audio&&url){
        const target=new URL(url,window.location.origin);
        if(target.origin!==window.location.origin||target.pathname!=="/api/download")throw Error("Download unavailable");
        const res=await fetch(target,{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});
        if(!res.ok)throw Error("Download failed");
        const blob=await res.blob();
        audio=new File([blob],filename,{type:blob.type});
      }
      if(controller.signal.aborted||!audio)return;
      if(tool!=="release-check"&&audio.size>40*1024*1024)throw Error("SIZE");
      offerReleaseFile(tool,audio);
      router.push(releaseToolHref(tool,lang));
    } catch {
      if(!controller.signal.aborted)setError(true);
    } finally {if(request.current===controller){request.current=null;setBusy(false);}}
  }
  return <section className={styles.quick} aria-label={en?"Continue with your master":"Mit deinem Master weiterarbeiten"}>
    <h2>{en?"From master to release":"Vom Master zum Release"}</h2>
    <p>{en?"Open a tool with this file. Release Check sends it for inspection only when you start the check.":"Öffne ein Tool mit dieser Datei. Der Release-Check sendet sie erst zur Prüfung, wenn du die Messung startest."}</p>
    <div className={styles.row}>{available.map(tool=><button type="button" key={tool} disabled={busy} onClick={()=>void go(tool)}>
      {AUDIO_RELEASE_TOOLS[tool][lang].action} →
    </button>)}</div>
    {busy&&<p role="status">{en?"Preparing master …":"Master wird geladen …"}</p>}
    {error&&<p role="alert">{en?"Could not transfer the file. Try a smaller format or open a downloaded file in the tool.":"Die Datei konnte nicht übergeben werden. Wähle ein kleineres Format oder öffne eine heruntergeladene Datei im Tool."}</p>}
  </section>;
}
