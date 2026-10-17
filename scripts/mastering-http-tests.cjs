// Real HTTP on the explicitly isolated 3013 QA service only. Synthetic audio.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{PrismaClient}=require('@prisma/client'),{hashSync}=require('bcryptjs');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated QA flag');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'validation-output','tools-audit-20261011','runtime');
const database=path.join(folder,'qa.sqlite');if(!fs.existsSync(database)||fs.realpathSync(folder)!==folder)throw Error('Expected isolated SQLite fixture');
const base='http://127.0.0.1:3013',jar=new Map();
async function request(url,options={}){
 const response=await fetch(base+url,{...options,headers:{Origin:base,Cookie:[...jar].map(([key,value])=>key+'='+value).join('; '),...options.headers},signal:AbortSignal.timeout(175000)});
 for(const raw of response.headers.getSetCookie()){const pair=raw.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1));}return response;
}
(async()=>{
 const db=new PrismaClient({datasources:{db:{url:'file:'+database.replaceAll('\\','/')}}});
 const email='mastering-014-'+Date.now()+'@example.invalid',password='Local-Audit-Only-2026!';
 try{await db.user.create({data:{email,name:'Isolated mastering QA',password:hashSync(password,10)}});}finally{await db.$disconnect();}
 assert.equal((await request('/api/control-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 const csrf=await(await request('/api/auth/csrf')).json();const login=await request('/api/auth/callback/credentials',{method:'POST',body:new URLSearchParams({csrfToken:csrf.csrfToken,email,password,json:'true',callbackUrl:base+'/dashboard'})});assert.ok(!(await login.json()).url.includes('error'));
 console.log('PASS actual credentials and protected control endpoint');
 const rate=48000,frames=rate*6,bytes=Buffer.alloc(44+frames*4);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(frames*4,40);
 for(let i=0;i<frames;i++){const x=.18*Math.sin(2*Math.PI*110*i/rate)+.04*Math.sin(2*Math.PI*6100*i/rate);bytes.writeInt16LE(Math.round(x*32767),44+i*4);bytes.writeInt16LE(Math.round(x*32767),46+i*4);}
 const form=new FormData();form.append('file',new File([bytes],'synthetic-mastering.wav',{type:'audio/wav'}));
 let response=await request('/api/upload',{method:'POST',body:form});assert.equal(response.status,200,await response.clone().text());const upload=await response.json();
 response=await request('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(upload)});assert.equal(response.status,200,await response.clone().text());const analysis=await response.json();assert.ok(analysis.analysis_token);assert.ok(Number.isFinite(analysis.bass_correlation));assert.ok(Number.isFinite(analysis.bass_side_ratio));console.log('PASS actual signed source analysis includes measured bass stereo');
 const settings={...upload,analysis,platform:'spotify',preset:'auto',intensity:65,format:'wav24',original_name:'synthetic-mastering.wav'};
 for(const overrides of[undefined,{low_shelf_gain:1.5,bass_mono_amount:.25,bus_comp_ratio:1.2}]){
   response=await request('/api/master',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...settings,...(overrides?{overrides}:{})})});assert.equal(response.status,200,await response.clone().text());
   const events=(await response.text()).split('\n').filter(line=>line.startsWith('data: ')).map(line=>JSON.parse(line.slice(6)));assert.ok(!events.some(event=>event.error),JSON.stringify(events));const result=events.find(event=>event.step==='complete');assert.ok(result?.master_id);assert.ok(result.params.comp_knee_db>0);assert.ok(result.post_analysis.true_peak<=-.9);
   if(overrides)assert.equal(result.params.bass_mono_amount,.25);
   const download=await request(result.formats.wav24);assert.equal(download.status,200);assert.ok((await download.arrayBuffer()).byteLength>44);
   console.log('PASS actual '+(overrides?'manual re-master':'auto-master')+' and private WAV download');
 }
 const before=await(await request('/api/account')).json();
 response=await request('/api/preview-section',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...upload,start:1,end:4})});assert.equal(response.status,200,await response.clone().text());assert.match(response.headers.get('cache-control'),/no-store/);const section=Buffer.from(await response.arrayBuffer());assert.equal(section.subarray(0,4).toString(),'RIFF');assert.ok(section.length>rate*3*2*4&&section.length<8000000);console.log('PASS actual buffered PCM16-source audition section');
 response=await request('/api/control-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...settings,start:1,end:4,overrides:{low_shelf_gain:1.5,bass_mono_amount:.25}})});assert.equal(response.status,200,await response.clone().text());assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('content-type'),'audio/wav');const audio=Buffer.from(await response.arrayBuffer());assert.equal(audio.subarray(0,4).toString(),'RIFF');assert.ok(audio.length>rate*3*2*4);
 const after=await(await request('/api/account')).json();assert.equal(after.masters.length,before.masters.length);console.log('PASS actual server control WAV without extra master/quota entry');
 console.log('6 actual mastering HTTP checks passed; no production audio or mail used.');
})().catch(error=>{console.error(error);process.exitCode=1;});
