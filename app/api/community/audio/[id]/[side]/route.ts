import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { db } from "@/lib/db";
import { communityId, communityHeaders, reviewCutoff } from "@/lib/communityExamples";

export async function GET(_request:Request,{params}:{params:Promise<{id:string;side:string}>}){
  const {id,side}=await params;
  if(!communityId(id)||(side!=="original"&&side!=="master"))return new Response(null,{status:404,headers:communityHeaders});
  const row=await db.communityExample.findUnique({where:{id},select:{userId:true,publishedAt:true,createdAt:true,reviewedAt:true}});
  if(!row)return new Response(null,{status:404,headers:communityHeaders});
  if(!row.publishedAt){
    if ((row.reviewedAt ?? row.createdAt) < reviewCutoff()) return new Response(null,{status:404,headers:communityHeaders});
    const session=await getServerSession(authOptions);
    if(session?.user?.id!==row.userId&&!await requireAdmin(session))return new Response(null,{status:404,headers:communityHeaders});
  }
  const where={id,publishedAt:row.publishedAt,reviewedAt:row.reviewedAt};
  const data=side==="original"?(await db.communityExample.findFirst({where,select:{original:true}}))?.original
    :(await db.communityExample.findFirst({where,select:{master:true}}))?.master;
  if(!data)return new Response(null,{status:404,headers:communityHeaders});
  return new Response(Buffer.from(data),{headers:{...communityHeaders,"Content-Type":"audio/mpeg","Content-Length":String(data.length),"X-Content-Type-Options":"nosniff"}});
}
