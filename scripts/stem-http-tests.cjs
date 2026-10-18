const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{PrismaClient}=require('@prisma/client'),{hashSync}=require('bcryptjs');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated QA flag');
const base='http://127.0.0.1:3013',database=path.resolve(__dirname,'../validation-output/stem-http/runtime/qa.sqlite');
if(!fs.existsSync(database))throw Error('Start isolated stem QA first');
const db=new PrismaClient({datasources:{db:{url:'file:'+database.replaceAll('\\','/')}}});
function client(){const jar=new Map();return async(url,options={})=>{const response=await fetch(base+url,{...options,headers:{Origin:base,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...options.headers},signal:AbortSignal.timeout(130000)});for(const raw of response.headers.getSetCookie()){const pair=raw.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}return response;}}
async function login(request,email){const csrf=await(await request('/api/auth/csrf')).json();const response=await request('/api/auth/callback/credentials',{method:'POST',body:new URLSearchParams({csrfToken:csrf.csrfToken,email,password:'Local-Stem-QA-Only!',json:'true',callbackUrl:base+'/tools/vocal-remover'})});assert.ok(!(await response.json()).url.includes('error'));}
function audio(){const sr=44100,n=sr*2,b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(Math.sin(i/sr*2*Math.PI*220)*4000);b.writeInt16LE(v,44+i*4);b.writeInt16LE(v,46+i*4);}return b;}
async function start(request,mode,tool){const form=new FormData();form.set('file',new File([audio()],'fixture.wav'));form.set('mode',mode);form.set('tool',tool);return request('/api/stems',{method:'POST',body:form});}
async function wait(request,id){const end=Date.now()+120000;while(Date.now()<end){const response=await request('/api/stems?id='+id);assert.equal(response.status,200);const {job}=await response.json();if(job.status==='done')return job;if(job.status==='error')throw Error('Actual worker failed');await new Promise(r=>setTimeout(r,1000));}throw Error('Timeout');}
(async()=>{const anon=client(),user=client(),admin=client(),other=client();const email='stem-'+Date.now()+'@example.invalid',foreign='other-'+Date.now()+'@example.invalid';
 try{for(const name of [email,foreign,'stem-admin@example.invalid'])await db.user.upsert({where:{email:name},create:{email:name,password:hashSync('Local-Stem-QA-Only!',10)},update:{}});
 const account=await db.user.findUnique({where:{email}});assert.equal(account.vocalRemoverEnabled,false);assert.equal(account.stemSeparationEnabled,false);
 assert.equal((await anon('/api/stems')).status,401);await login(user,email);await login(other,foreign);await login(admin,'stem-admin@example.invalid');
 assert.equal((await start(user,'full','stem-separation')).status,403);
 let response=await start(user,'preview','stem-separation');assert.equal(response.status,202,await response.clone().text());let job=await response.json();await wait(user,job.id);
 assert.equal((await other('/api/stems?id='+job.id)).status,404);response=await user('/api/stems?id='+job.id+'&asset=vocals');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/inline/);assert.ok((await response.arrayBuffer()).byteLength>44);
 console.log('PASS actual signed-in trial, private model output and cross-account rejection');
 const change=enabled=>({method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:account.id,vocalRemoverEnabled:enabled,stemSeparationEnabled:false})});
 assert.equal((await user('/api/admin/stem-access',change(true))).status,403);assert.equal((await admin('/api/admin/stem-access',change(true))).status,200);
 assert.equal((await start(user,'full','stem-separation')).status,403);response=await start(user,'full','vocal-remover');assert.equal(response.status,202);job=await response.json();await wait(user,job.id);
 response=await user('/api/stems?id='+job.id+'&asset=instrumental');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/attachment/);assert.ok((await response.arrayBuffer()).byteLength>44);
 assert.equal((await admin('/api/admin/stem-access',change(false))).status,200);assert.equal((await user('/api/stems?id='+job.id+'&asset=vocals')).status,403);
 console.log('PASS actual admin activation, independent tools, full instrumental download and immediate revocation');
 }finally{await db.$disconnect();}
})().catch(error=>{console.error(error);process.exitCode=1});
