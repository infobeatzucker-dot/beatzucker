"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileAudio2, UploadCloud } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import { useToolJob } from "@/lib/useToolJob";
import ToolLanguageNav from "./ToolLanguageNav";
import ToolJourney from "./ToolJourney";

export default function Mp3ConverterTool({ lang }: { lang: Lang }) {
  const en = lang === "en", job = useToolJob(), input = useRef<HTMLInputElement>(null);
  const [file,setFile] = useState<File|null>(null), [quality,setQuality] = useState("320"), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [result,setResult] = useState<{url:string;quality:string;size:number;peak:number|null}|null>(null);
  const [originalUrl,setOriginalUrl] = useState("");
  useEffect(()=>{if (!file) {setOriginalUrl("");return;} const url=URL.createObjectURL(file);setOriginalUrl(url);return()=>URL.revokeObjectURL(url);},[file]);
  useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
  function choose(next: File) { if(busy)return;setResult(null);setError("");if(!/\.wav$/i.test(next.name)||next.size<44||next.size>80*1024*1024){setFile(null);setError(en?"Choose a WAV file up to 80 MB.":"Bitte eine WAV-Datei bis 80 MB wählen.");return;}setFile(next); }
  function reset(){job.cancel();setBusy(false);setResult(null);setFile(null);setError("");if(input.current)input.current.value="";}
  async function convert(){if(!file||busy)return;const task=job.start();setBusy(true);setError("");setResult(null);try{const body=new FormData();body.set("file",file);body.set("quality",quality);const response=await fetch("/api/mp3-convert",{method:"POST",body,signal:task.signal});if(!response.ok){const info=await response.json();throw Error(info.error||(en?"Conversion failed.":"Konvertierung fehlgeschlagen."));}if(!response.headers.get("Content-Type")?.startsWith("audio/mpeg"))throw Error("Invalid MP3 response");const blob=await response.blob();if(!job.active(task))return;if(blob.size<100)throw Error("Empty MP3");const peak=response.headers.get("X-Encoded-True-Peak");setResult({url:URL.createObjectURL(blob),quality,size:blob.size,peak:peak!==null&&Number.isFinite(Number(peak))?Number(peak):null});}catch(reason){if(job.active(task))setError(reason instanceof Error?reason.message:"Conversion failed");}finally{if(job.active(task))setBusy(false);}}
  return <section className="stream-tool utility-tool"><ToolLanguageNav lang={lang}/><Link className="tool-back" href={en?"/en/tools":"/tools"}><ArrowLeft size={15}/>{en?"All tools":"Alle Tools"}</Link>
    <div className="stream-hero"><span><FileAudio2 size={14}/> MP3 EXPORT LAB</span><h1>{en?<>Convert WAV <em>to MP3.</em></>:<>WAV in MP3 <em>umwandeln.</em></>}</h1><p>{en?"Choose your quality. Convert. Download the complete file.":"Qualität wählen. Konvertieren. Vollständige Datei herunterladen."}</p></div>
    <input ref={input} hidden type="file" accept=".wav,audio/wav" onChange={event=>{const next=event.target.files?.[0];if(next)choose(next)}}/>
    <ToolJourney mode="feedback" tool="wav-to-mp3" lang={lang} busy={busy} complete={!!result} error={error} progress={en?"Uploading and encoding the complete WAV…":"Die vollständige WAV wird hochgeladen und kodiert…"}/>
    {!file?<button className="stream-upload utility-upload" disabled={busy} onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const next=e.dataTransfer.files[0];if(next)choose(next)}}><UploadCloud size={30}/><strong>{en?"Drop your WAV or choose a file":"WAV hier ablegen oder Datei wählen"}</strong><span>{en?"No sign-in · max 80 MB · 10 minutes · mono/stereo":"Ohne Anmeldung · max. 80 MB · 10 Minuten · Mono/Stereo"}</span></button>:<div className="stream-console"><div className="stream-file"><div><strong>{file.name}</strong><span>{(file.size/1024/1024).toFixed(1)} MB · WAV</span></div><button disabled={busy} onClick={reset}>{en?"Change file":"Datei wechseln"}</button></div>
      <label className="utility-field">{en?"MP3 quality":"MP3-Qualität"}<select disabled={busy} value={quality} onChange={e=>{setQuality(e.target.value);setResult(null)}}><option value="320">320 kbit/s · {en?"higher quality":"höhere Qualität"}</option><option value="128">128 kbit/s · {en?"smaller file":"kleinere Datei"}</option></select></label>
      {originalUrl&&<label className="utility-audio-label">Original<audio src={originalUrl} controls preload="metadata"/></label>}
      <button className="conflict-run" disabled={busy} onClick={()=>void convert()}>{busy?(en?"Converting…":"Wird konvertiert…"):(en?"Convert to MP3":"In MP3 umwandeln")}</button>{busy&&<button className="tool-back" onClick={reset}>{en?"Cancel":"Abbrechen"}</button>}
      {result&&<div className="utility-download"><strong>MP3 · {result.quality} kbit/s · {(result.size/1024/1024).toFixed(2)} MB</strong><audio src={result.url} controls preload="metadata"/><a className="converter-download" href={result.url} download={`${file.name.replace(/\.wav$/i,"")}-${result.quality}k.mp3`}><Download size={18}/>{en?"Download MP3":"MP3 herunterladen"}</a>{result.peak!==null&&result.peak>0&&<p>{en?"Encoding created peaks above 0 dBTP. Reduce the source level if you hear distortion.":"Die Kodierung erzeugt Spitzen über 0 dBTP. Bei hörbarer Verzerrung den Quellpegel reduzieren."}</p>}</div>}
      <p className="stream-honesty">{en?"Your WAV is uploaded temporarily for server encoding, then removed after the request. No mastering or loudness normalization. Unsupported MP3 sample rates are converted to 32/44.1/48 kHz. MP3 is lossy; keep your original WAV. Technical limits may require retrying later.":"Deine WAV wird zur Kodierung vorübergehend auf den Server geladen und nach der Anfrage entfernt. Kein Mastering und keine Lautheitsnormalisierung. Für MP3 ungeeignete Sampleraten werden auf 32/44,1/48 kHz umgerechnet. MP3 ist verlustbehaftet – bewahre die originale WAV auf. Bei ausgelastetem Dienst bitte später erneut versuchen."}</p>
    </div>}
    <ToolJourney mode="recommendations" tool="wav-to-mp3" lang={lang} busy={busy} complete={!!result} error={error} progress={en?"Uploading and encoding the complete WAV…":"Die vollständige WAV wird hochgeladen und kodiert…"}/>
  </section>;
}
