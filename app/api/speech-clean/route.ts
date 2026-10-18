import { randomUUID } from "crypto";
import { mkdir, open, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { readBoundedMultipart, uploadRequestFailure } from "@/lib/boundedMultipart";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 180;
const MAX = 80*1024*1024;
const state = globalThis as typeof globalThis & { __speechCleans?: number };
const headers = { "Cache-Control":"private, no-store", "X-Robots-Tag":"noindex" };
const fail = (error:string,status:number) => NextResponse.json({error},{status,headers});
export async function POST(req:NextRequest) {
  const origin=req.headers.get("origin");
  if(origin && origin!==new URL(process.env.NEXTAUTH_URL??"https://beatzucker.de").origin)return fail("Forbidden",403);
  if((state.__speechCleans??0)>=1)return fail("Audio service busy. / Audiodienst ausgelastet. Bitte gleich erneut versuchen.",503);
  if(!rateLimit("speech-clean:global",30,3600000))return fail("Limit reached. Please retry later. / Limit erreicht. Bitte später erneut versuchen.",429);
  state.__speechCleans=(state.__speechCleans??0)+1;
  let source="",owned=false,release:(()=>void)|undefined;
  try {
    const upload=await readBoundedMultipart(req,MAX);release=upload.release;
    const file=upload.form.get("file"),strength=upload.form.get("strength"),lowCut=upload.form.get("lowCut"),level=upload.form.get("level");
    if(!(file instanceof File)||file.size<44||file.size>MAX)return fail("Choose WAV, MP3 or FLAC up to 80 MB. / Bitte WAV, MP3 oder FLAC bis 80 MB wählen.",413);
    if(!["gentle","balanced","strong"].includes(String(strength))||!["true","false"].includes(String(lowCut))||!["true","false"].includes(String(level)))return fail("Invalid settings / Ungültige Einstellungen",400);
    const magic=Buffer.from(await file.slice(0,12).arrayBuffer());
    const extension=magic.subarray(0,4).toString()==="RIFF"&&magic.subarray(8,12).toString()==="WAVE"?"wav":magic.subarray(0,4).toString()==="fLaC"?"flac":magic.subarray(0,3).toString()==="ID3"||(magic[0]===255&&(magic[1]&224)===224)?"mp3":null;
    if(!extension)return fail("Unsupported audio / Nicht unterstützte Audiodatei",415);
    const root=process.env.TEMP_UPLOAD_DIR||"./uploads";
    await mkdir(/*turbopackIgnore: true*/ root,{recursive:true});
    source=path.resolve(/*turbopackIgnore: true*/ root,`speech-clean-${randomUUID()}.${extension}`);
    const handle=await open(/*turbopackIgnore: true*/ source,"wx");owned=true;
    try{await pipeline(Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),handle.createWriteStream());}finally{await handle.close().catch(()=>{});}
    const response=await fetch(`${process.env.PYTHON_SERVICE_URL||"http://127.0.0.1:8001"}/speech-clean`,{method:"POST",headers:pythonServiceHeaders(),body:JSON.stringify({file_path:source,strength,low_cut:lowCut==="true",level:level==="true"}),signal:AbortSignal.any([req.signal,AbortSignal.timeout(160000)])});
    if(!response.ok)return fail(response.status===503?"Audio service busy. / Audiodienst ausgelastet. Bitte gleich erneut versuchen.":"Cleanup failed. Use audible mono/stereo audio, 0.4 seconds to 5 minutes, 16–192 kHz. / Bereinigung fehlgeschlagen. Bitte hörbares Mono-/Stereo-Audio mit 0,4 Sekunden bis 5 Minuten und 16–192 kHz verwenden.",response.status===503?503:422);
    if(!response.headers.get("Content-Type")?.startsWith("audio/wav"))throw Error("Invalid WAV response");
    const reader=response.body?.getReader();if(!reader)throw Error("Missing WAV");
    const chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
    try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>96*1024*1024){await reader.cancel();throw Error("Output too large");}chunks.push(new Uint8Array(next.value));}}finally{reader.releaseLock();}
    if(size<44)throw Error("Empty output");
    const report=JSON.parse(response.headers.get("X-Speech-Report")||"{}");
    if(![report.true_peak,report.integrated_lufs,report.duration,report.gain_db].every(Number.isFinite)||![1,2].includes(report.channels))throw Error("Invalid speech report");
    return new Response(new Blob(chunks,{type:"audio/wav"}),{headers:{...headers,"Content-Type":"audio/wav","Content-Disposition":"attachment; filename=\"beatzucker-speech.wav\"","X-Speech-Report":JSON.stringify(report)}});
  }catch(error){return uploadRequestFailure(error)??fail("Processing interrupted or unavailable. Please try again. / Verarbeitung unterbrochen oder nicht verfügbar. Bitte erneut versuchen.",503);}
  finally{release?.();if(owned)await unlink(/*turbopackIgnore: true*/ source).catch(()=>{});state.__speechCleans=Math.max(0,(state.__speechCleans??1)-1);}
}
