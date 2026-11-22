import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { communityHeaders, communityEntry, communityId, communitySelection, reviewCutoff, submitCommunityExample } from "@/lib/communityExamples";
import { ShowcaseError } from "@/lib/showcasePublication";

export const maxDuration=240;
const json=(body:object,status=200)=>Response.json(body,{status,headers:communityHeaders});
const owner=async()=> (await getServerSession(authOptions))?.user?.id;
export async function GET() {
  const userId=await owner();
  if(!userId)return json({error:"SIGN_IN"},401);
  const cutoff=reviewCutoff();
  const rows=await db.communityExample.findMany({where:{userId,OR:[{publishedAt:{not:null}},{reviewedAt:null,createdAt:{gte:cutoff}},{reviewedAt:{gte:cutoff}}]},select:communitySelection,orderBy:{createdAt:"desc"}});
  return json({examples:rows.map(communityEntry).filter(Boolean)});
}
export async function POST(req:NextRequest) {
  const userId=await owner();
  if(!userId)return json({error:"SIGN_IN"},401);
  try{
    const body=await readAuthRequest(req,"community:submit");
    if(!rateLimit("community:submit:"+userId,5,3600000))return json({error:"LIMIT"},429);
    return json({example:await submitCommunityExample(userId,body)},201);
  }catch(error){
    const invalid=authRequestFailure(error);if(invalid)return invalid;
    if(error instanceof ShowcaseError)return json({error:error.message},error.status);
    console.error("[community] submission failed");
    return json({error:"BUSY"},503);
  }
}
export async function PATCH(req:NextRequest) {
  const userId=await owner();
  if(!userId)return json({error:"SIGN_IN"},401);
  try {
    const {id,problem,settings}=await readAuthRequest(req,"community:revise");
    if(!communityId(id)||typeof problem!=="string"||problem.trim().length<8||problem.trim().length>360||
      typeof settings!=="string"||settings.trim().length<8||settings.trim().length>500)return json({error:"INVALID"},400);
    const example=await db.$transaction(async tx=>{
      const row=await tx.communityExample.findFirst({where:{id,userId,publishedAt:null,rejectionReason:{not:null},reviewedAt:{gte:reviewCutoff()}},select:{id:true}});
      if(!row)return null;
      if(await tx.communityExample.count({where:{publishedAt:null,rejectionReason:null}})>=30)throw new ShowcaseError("LIMIT",409);
      return communityEntry(await tx.communityExample.update({where:{id},data:{problem:problem.trim(),settings:settings.trim(),reviewedAt:new Date(),rejectionReason:null},select:communitySelection}));
    });
    return example?json({example}):json({error:"NOT_FOUND"},404);
  }catch(error){
    const invalid=authRequestFailure(error);if(invalid)return invalid;
    return error instanceof ShowcaseError?json({error:error.message},error.status):json({error:"BUSY"},503);
  }
}
export async function DELETE(req:NextRequest) {
  const userId=await owner();
  if(!userId)return json({error:"SIGN_IN"},401);
  try{
    const {id}=await readAuthRequest(req,"community:remove");
    if(!communityId(id))return json({error:"INVALID"},400);
    const row=await db.communityExample.deleteMany({where:{id,userId}});
    return json(row.count?{ok:true}:{error:"NOT_FOUND"},row.count?200:404);
  }catch(error){return authRequestFailure(error)??json({error:"BUSY"},503);}
}
