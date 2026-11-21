import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { SHOWCASE_STORAGE, ShowcaseError, showcaseMetadata } from "@/lib/showcasePublication";
import { validShowcaseTrack, type ShowcaseTrack } from "@/lib/showcaseTracks";
import { findFileById } from "@/lib/storage";
import { verifyUpload } from "@/lib/uploadAuthorization";
import { pythonServiceHeaders } from "@/lib/pythonService";

export const communitySelection={id:true,artist:true,problem:true,settings:true,language:true,trackJson:true,createdAt:true,publishedAt:true} as const;
export const communityHeaders={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const validId=(id:unknown): id is string=>typeof id==="string"&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id);
export {validId as communityId};

type Stored = {id:string;artist:string;problem:string;settings:string;language:string;trackJson:string;createdAt:Date;publishedAt:Date|null};
export function communityEntry(row:Stored) {
  try{
    const base:unknown=JSON.parse(row.trackJson);
    if(!validShowcaseTrack(base)||base.id!==row.id)return null;
    const track:ShowcaseTrack={...base,
      original:{...base.original,url:"/api/community/audio/"+row.id+"/original"},
      master:{...base.master,url:"/api/community/audio/"+row.id+"/master"},
    };
    const {trackJson:_,...meta}=row;
    return {...meta,track};
  }catch{return null;}
}
export async function publicCommunityExamples() {
  const rows=await db.communityExample.findMany({where:{publishedAt:{not:null}},select:communitySelection,orderBy:{publishedAt:"desc"},take:12});
  return rows.map(communityEntry).filter(entry=>entry!==null);
}
function textField(value:unknown,min:number,max:number) {
  if(typeof value!=="string"||value.trim().length<min||value.trim().length>max)throw new ShowcaseError("INVALID");
  return value.trim();
}
const state=globalThis as typeof globalThis & { __communityRenders?: Set<string> };
export async function submitCommunityExample(userId:string,body:Record<string,unknown>) {
  const metadata=showcaseMetadata(body);
  const artist=textField(body.artist,1,70),problem=textField(body.problem,8,360),settings=textField(body.settings,8,500);
  const language=body.language==="en"?"en":"de";
  const start=body.start;
  if(body.consent!==true||typeof start!=="number"||!Number.isFinite(start)||start<0||start>576)throw new ShowcaseError("INVALID");
  const active=state.__communityRenders??=new Set();
  if(active.has(userId)||active.size>=2)throw new ShowcaseError("BUSY",503);
  const id=randomUUID();
  const assets=(["original","master"] as const).map(side=>path.join(/*turbopackIgnore: true*/ SHOWCASE_STORAGE,id+"-"+side+".mp3"));
  active.add(userId);
  try {
    if(await db.communityExample.count({where:{userId}})>=3||await db.communityExample.count({where:{publishedAt:null}})>=30)throw new ShowcaseError("LIMIT",409);
    const sources:string[]=[];
    for(const item of [body.original,body.master]){
      const ref=item as {file_id?:unknown;upload_token?:unknown}|null;
      if(!ref||!validId(ref.file_id)||!verifyUpload(ref.file_id,userId,ref.upload_token))throw new ShowcaseError("INVALID_UPLOAD",403);
      const source=await findFileById(ref.file_id);
      if(!source)throw new ShowcaseError("INVALID_UPLOAD",404);
      sources.push(path.resolve(/*turbopackIgnore: true*/ source));
    }
    if(sources[0]===sources[1])throw new ShowcaseError("INVALID_UPLOAD");
    const response=await fetch((process.env.PYTHON_SERVICE_URL??"http://127.0.0.1:8001")+"/showcase-prepare",{
      method:"POST",headers:pythonServiceHeaders(),body:JSON.stringify({original:sources[0],master:sources[1],start,asset_id:id}),signal:AbortSignal.timeout(210000),
    });
    if(!response.ok)throw new ShowcaseError(response.status===503?"BUSY":"ALIGNMENT",response.status===503?503:422);
    const rendered=await response.json();
    const track={ id,...metadata,sourceStart:start,duration:24,original:rendered.original,master:rendered.master };
    if(!validShowcaseTrack(track)||track.original.url!=="/api/showcase/audio/"+id+"-original.mp3"||
      track.master.url!=="/api/showcase/audio/"+id+"-master.mp3")throw new ShowcaseError("ALIGNMENT",502);
    const [original,master]=await Promise.all(assets.map(file=>readFile(/*turbopackIgnore: true*/ file)));
    if(original.length!==track.original.bytes||master.length!==track.master.bytes)throw new ShowcaseError("ALIGNMENT",502);
    return await db.$transaction(async tx=>{
      if(await tx.communityExample.count({where:{userId}})>=3||await tx.communityExample.count({where:{publishedAt:null}})>=30)throw new ShowcaseError("LIMIT",409);
      const row=await tx.communityExample.create({data:{id,userId,artist,problem,settings,language,trackJson:JSON.stringify(track),original,master},select:communitySelection});
      return communityEntry(row);
    });
  } finally {
    await Promise.all(assets.map(file=>unlink(/*turbopackIgnore: true*/ file).catch(()=>{})));
    active.delete(userId);
  }
}
