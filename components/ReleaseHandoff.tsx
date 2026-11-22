"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types/mastering";
import { AUDIO_RELEASE_TOOLS, releaseCheckMaxBytes, releaseToolHref } from "@/lib/releaseTools";
import { offerReleaseFile, type HandoffTool } from "@/lib/releaseHandoff";
import styles from "./ListeningEntry.module.css";

const options: HandoffTool[] = ["release-check","mastering-blindtest","audio-visualizer"];
const maxBytes = (tool:HandoffTool) => tool === "release-check" ? releaseCheckMaxBytes : 40 * 1024 * 1024;
const accepted = (filename:string) => /\.(wav|flac|mp3|aac|m4a)$/i.test(filename);

export default function ReleaseHandoff({ lang, filename, url, file }: {lang:Lang;filename:string;url?:string;file?:File}) {
  const en=lang==="en", router=useRouter();
  const request=useRef<AbortController | null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState<""|"size"|"failed">("");
  useEffect(()=>{setBusy(false);setError("");return()=>{request.current?.abort();request.current=null;};},[url,file]);
  const available=options.filter(tool=>tool!=="release-check" || accepted(filename));
  if (!file && !url) return null;
  async function go(tool:HandoffTool) {
    if(request.current)return;
    const controller=new AbortController();
    request.current=controller;setBusy(true);setError("");
    const maximum = maxBytes(tool);
    try {
      let audio=file;
      if(!audio&&url){
        const target=new URL(url,window.location.origin);
        if(target.origin!==window.location.origin||target.pathname!=="/api/download")throw Error("Download unavailable");
        const id=target.searchParams.get("master_id"),format=target.searchParams.get("format");
        if(tool==="release-check"&&id&&format){
          offerReleaseFile(tool,{id,format,name:filename});
          router.push(releaseToolHref(tool,lang));
          return;
        }
        const res=await fetch(target,{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});
        if(!res.ok)throw Error("Download failed");
        if (Number(res.headers.get("Content-Length")) > maximum) {
          await res.body?.cancel(); throw Error("SIZE");
        }
        const reader = res.body?.getReader();
        if (!reader) throw Error("Download unavailable");
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let size = 0;
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > maximum) { await reader.cancel(); throw Error("SIZE"); }
            chunks.push(new Uint8Array(chunk.value));
          }
        } finally { reader.releaseLock(); }
        const blob = new Blob(chunks,{type:res.headers.get("Content-Type")??""});
        audio=new File([blob],filename,{type:blob.type});
      }
      if(controller.signal.aborted||!audio)return;
      if(audio.size>maximum)throw Error("SIZE");
      offerReleaseFile(tool,audio);
      router.push(releaseToolHref(tool,lang));
    } catch (failure) {
      if(!controller.signal.aborted)setError(failure instanceof Error && failure.message==="SIZE"?"size":"failed");
    } finally {if(request.current===controller){request.current=null;setBusy(false);}}
  }
  return <section className={styles.quick} aria-label={en?"Continue with your master":"Mit deinem Master weiterarbeiten"}>
    <h2>{en?"From master to release":"Vom Master zum Release"}</h2>
    <p>{en?"Open a tool with this file. Inspection starts when you confirm it in Release Check.":"Öffne ein Tool mit dieser Datei. Die Messung startet nach deiner Bestätigung im Release-Check."}</p>
    <div className={styles.row}>{available.map(tool=><button type="button" key={tool} disabled={busy || Boolean(file && file.size > maxBytes(tool))} onClick={()=>void go(tool)}>
      {AUDIO_RELEASE_TOOLS[tool][lang].action} → <small>{maxBytes(tool)/1048576} MiB</small>
    </button>)}</div>
    {busy&&<button type="button" onClick={()=>{request.current?.abort();}}>{en?"Cancel transfer":"Übertragung abbrechen"}</button>}
    {busy&&<p role="status">{en?"Preparing master …":"Master wird geladen …"}</p>}
    {error&&<p role="alert">{error==="size"?(en?"This file exceeds the tool’s limit. Export a smaller format or shorten the track.":"Die Datei überschreitet das Tool-Limit. Exportiere ein kleineres Format oder kürze den Track."):(en?"Could not transfer the file. Open the downloaded file in the tool.":"Die Datei konnte nicht übergeben werden. Öffne die heruntergeladene Datei im Tool.")}</p>}
  </section>;
}
