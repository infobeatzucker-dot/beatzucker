import {NextRequest,NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/authOptions';
import {db} from '@/lib/db';
import {assertCurrentSession} from '@/lib/accountSecurity';
import {readAuthRequest,authRequestFailure,AuthRequestError} from '@/lib/authRequest';
import {isUiTheme} from '@/lib/uiTheme';

export async function GET(){
 try{const session=await getServerSession(authOptions);if(!session?.user?.id)throw new AuthRequestError('Please sign in. / Bitte anmelden.',401);const user=await db.user.findUnique({where:{id:session.user.id}});if(!user)throw new AuthRequestError('Please sign in. / Bitte anmelden.',401);assertCurrentSession(session,user);return NextResponse.json({theme:isUiTheme(user.uiTheme)?user.uiTheme:null},{headers:{'Cache-Control':'no-store'}});}
 catch(error){return authRequestFailure(error)??NextResponse.json({error:'Theme unavailable / Farbschema nicht verfügbar'},{status:500});}
}
export async function PATCH(request:NextRequest){
 try{const session=await getServerSession(authOptions);if(!session?.user?.id)throw new AuthRequestError('Please sign in. / Bitte anmelden.',401);const body=await readAuthRequest(request,'account:theme');if(!isUiTheme(body.theme)||Object.keys(body).some(key=>key!=='theme'))throw new AuthRequestError('Invalid theme / Ungültiges Farbschema',400);const theme=body.theme;
  await db.$transaction(async tx=>{const user=await tx.user.findUnique({where:{id:session.user.id}});if(!user)throw new AuthRequestError('Please sign in. / Bitte anmelden.',401);assertCurrentSession(session,user);await tx.user.update({where:{id:user.id},data:{uiTheme:theme}});});return NextResponse.json({ok:true,theme},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return authRequestFailure(error)??NextResponse.json({error:'Saving failed / Speichern fehlgeschlagen'},{status:500});}
}
