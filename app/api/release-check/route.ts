import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { releaseCheckMaxBytes } from "@/lib/releaseTools";

export const maxDuration = 300;
const formats = new Set(["wav", "mp3", "aac", "m4a"]);
const state = globalThis as typeof globalThis & { releaseCheckActive?: number };
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
const fail = (code:string,status:number)=>Response.json({code},{status,headers});
const ascii = (bytes:Buffer,from:number,to:number)=>bytes.toString("ascii",from,to);
function hasExpectedHeader(bytes:Buffer, format:string) {
  if (format === "wav") return ascii(bytes,0,4)==="RIFF" && ascii(bytes,8,12)==="WAVE";
  if (format === "m4a") return ascii(bytes,4,8)==="ftyp";
  if (ascii(bytes,0,3)==="ID3") return true;
  if (bytes[0]!==0xff) return false;
  return format === "aac" ? (bytes[1] & 0xf6) === 0xf0 : (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0;
}

export async function POST(req:NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(process.env.NEXTAUTH_URL ?? "https://beatzucker.de").origin) return fail("FORBIDDEN",403);
  const format=req.nextUrl.searchParams.get("format")??"";
  if (!formats.has(format) || req.headers.get("content-type")!=="application/octet-stream" || !req.body) return fail("DECODE",415);
  if (Number(req.headers.get("content-length"))>releaseCheckMaxBytes) return fail("RELEASE_SIZE",413);
  if ((state.releaseCheckActive ?? 0) >= 2) return fail("BUSY",503);
  const ip=req.headers.get("x-real-ip")??"unknown";
  const key=createHash("sha256").update(ip).digest("hex").slice(0,24);
  if (!rateLimit("release-check:global",32,3600000)||!rateLimit("release-check:"+key,8,3600000)) return fail("LIMIT",429);
  state.releaseCheckActive=(state.releaseCheckActive??0)+1;
  let file:string|undefined, size=0, oversized=false;
  try {
    const root=path.resolve(/*turbopackIgnore: true*/ process.env.TEMP_UPLOAD_DIR??"./uploads");
    await mkdir(root,{recursive:true});
    file=path.join(root,"mixcheck-"+randomUUID()+"."+format);
    const limit=new Transform({
      transform(chunk:Buffer,_encoding,done){
        size+=chunk.length;
        if(size<=releaseCheckMaxBytes){done(null,chunk);return;}
        oversized=true;
        done(Error("Audio upload too large"));
      },
    });
    await pipeline(Readable.fromWeb(req.body as NodeStream<Uint8Array>),limit,createWriteStream(file,{flags:"wx"}),
      {signal:AbortSignal.any([req.signal,AbortSignal.timeout(120000)])});
    if(size<12)return fail("DECODE",415);
    const descriptor=await open(file,"r"), bytes=Buffer.alloc(12);
    try {await descriptor.read(bytes);} finally {await descriptor.close();}
    if(!hasExpectedHeader(bytes,format))return fail("DECODE",415);
    // The worker owns a DSP lease. Cleanup follows its bounded metering request.
    const result=await fetch((process.env.PYTHON_SERVICE_URL??"http://localhost:8001")+"/release-check",{
      method:"POST",headers:pythonServiceHeaders(),body:JSON.stringify({file_path:file}),signal:AbortSignal.timeout(160000),
    });
    if(!result.ok)return fail(result.status===503?"BUSY":result.status===504?"TIMEOUT":"DECODE",
      [422,503,504].includes(result.status)?result.status:502);
    return Response.json({report:await result.json()},{headers});
  } catch(error) {
    if(oversized)return fail("RELEASE_SIZE",413);
    return error instanceof Error && (error.name==="TimeoutError"||error.name==="AbortError")?fail("TIMEOUT",504):fail("BUSY",503);
  } finally {
    if(file)await unlink(file).catch(()=>{});
    state.releaseCheckActive=Math.max(0,(state.releaseCheckActive??1)-1);
  }
}
