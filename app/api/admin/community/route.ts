import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { db } from "@/lib/db";
import { readAuthRequest, authRequestFailure } from "@/lib/authRequest";
import { communityEntry, communityHeaders, communityId, communitySelection } from "@/lib/communityExamples";

const json=(body:object,status=200)=>Response.json(body,{status,headers:communityHeaders});
const admin=async()=>requireAdmin(await getServerSession(authOptions));
export async function GET(){
  if(!await admin())return json({error:"FORBIDDEN"},403);
  const rows=await db.communityExample.findMany({select:communitySelection,orderBy:{createdAt:"desc"},take:42});
  return json({examples:rows.map(communityEntry).filter(Boolean)});
}
export async function PATCH(req:NextRequest){
  if(!await admin())return json({error:"FORBIDDEN"},403);
  try{
    const {id,action}=await readAuthRequest(req,"community:moderate");
    if(!communityId(id)||!["publish","unpublish","remove"].includes(String(action)))return json({error:"INVALID"},400);
    const status=await db.$transaction(async tx=>{
      const row=await tx.communityExample.findUnique({where:{id},select:{publishedAt:true}});
      if(!row)return 404;
      if(action==="remove"){await tx.communityExample.delete({where:{id}});return 200;}
      if(action==="publish"&&!row.publishedAt&&await tx.communityExample.count({where:{publishedAt:{not:null}}})>=12)return 409;
      await tx.communityExample.update({where:{id},data:{publishedAt:action==="publish"?row.publishedAt??new Date():null}});
      return 200;
    });
    return status===200?json({ok:true}):json({error:status===404?"NOT_FOUND":"LIMIT"},status);
  }catch(error){return authRequestFailure(error)??json({error:"BUSY"},503);}
}
