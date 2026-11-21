import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { normalizeLabPreset } from "@/lib/labPresetValidation";

const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const response=(value:object,status=200)=>Response.json(value,{status,headers});
const owner=async()=> (await getServerSession(authOptions))?.user?.id;
const format=(row:{id:string;name:string;updatedAt:Date;settingsJson:string})=>{
  try {
    const data=normalizeLabPreset(JSON.parse(row.settingsJson));
    return data?{id:row.id,name:row.name,updatedAt:row.updatedAt.toISOString(),...data}:null;
  }catch{return null;}
};

export async function GET() {
  const userId=await owner();
  if(!userId)return response({error:"SIGN_IN"},401);
  const rows=await db.labPreset.findMany({where:{userId},orderBy:{updatedAt:"desc"},take:30});
  return response({presets:rows.map(format).filter(Boolean)});
}
export async function POST(req:NextRequest) { return write(req); }
export async function PATCH(req:NextRequest) { return write(req); }
export async function DELETE(req:NextRequest) { return write(req); }
async function write(req:NextRequest) {
  const userId=await owner();
  if(!userId)return response({error:"SIGN_IN"},401);
  try{
    const body=await readAuthRequest(req,"lab-presets:write");
    const id=typeof body.id==="string"&&/^[a-z0-9]{20,40}$/.test(body.id)?body.id:null;
    if(req.method==="DELETE" || req.method==="PATCH"){
      if(!id)return response({error:"INVALID"},400);
      if(req.method==="DELETE"){
        const deleted=await db.labPreset.deleteMany({where:{id,userId}});
        return response(deleted.count?{ok:true}:{error:"NOT_FOUND"},deleted.count?200:404);
      }
    }
    const name=typeof body.name==="string"?body.name.trim():"";
    if(!name||name.length>70)return response({error:"INVALID"},400);
    const preset=Object.hasOwn(body,"settings")?normalizeLabPreset(body):null;
    if((req.method==="POST"||Object.hasOwn(body,"settings"))&&!preset)return response({error:"INVALID"},400);
    if(id&&req.method==="PATCH"){
      const changed=await db.labPreset.updateMany({where:{id,userId},data:{name,...(preset?{settingsJson:JSON.stringify(preset)}:{})}});
      return response(changed.count?{ok:true}:{error:"NOT_FOUND"},changed.count?200:404);
    }
    const created=await db.$transaction(async tx=>{
      if(await tx.labPreset.count({where:{userId}})>=30)return null;
      return tx.labPreset.create({data:{userId,name,settingsJson:JSON.stringify(preset)}});
    });
    return created?response({preset:format(created)},201):response({error:"LIMIT"},409);
  }catch(error){
    const requestFailure=authRequestFailure(error);if(requestFailure)return requestFailure;
    const code=(error as {code?:string}).code;
    return code==="P2002"?response({error:"DUPLICATE"},409):response({error:"RETRY"},503);
  }
}
