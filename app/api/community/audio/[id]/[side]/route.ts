import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdmin } from "@/lib/adminAccess";
import { db } from "@/lib/db";
import { communityId, communityHeaders } from "@/lib/communityExamples";

export async function GET(_request:Request,{params}:{params:Promise<{id:string;side:string}>}){
  const {id,side}=await params;
  if(!communityId(id)||(side!=="original"&&side!=="master"))return new Response(null,{status:404,headers:communityHeaders});
  const row=await db.communityExample.findUnique({where:{id},select:{userId:true,publishedAt:true,[side]:true}});
  if(!row)return new Response(null,{status:404,headers:communityHeaders});
  if(!row.publishedAt){
    const session=await getServerSession(authOptions);
    if(session?.user?.id!==row.userId&&!await requireAdmin(session))return new Response(null,{status:404,headers:communityHeaders});
  }
  const data=(row as typeof row & Record<typeof side,Uint8Array>)[side];
  return new Response(Buffer.from(data),{headers:{...communityHeaders,"Content-Type":"audio/mpeg","Content-Length":String(data.length),"X-Content-Type-Options":"nosniff"}});
}
