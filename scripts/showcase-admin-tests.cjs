/* Real isolated SQLite, actual routes, synthetic excerpt files; no production or mail. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{spawnSync}=require('node:child_process');
const folder=path.resolve('validation-output/showcase-admin-tests',`${Date.now()}-${process.pid}`);fs.mkdirSync(folder,{recursive:true});
fs.closeSync(fs.openSync(path.join(folder,'qa.sqlite'),'wx'));
const url='file:'+path.join(folder,'qa.sqlite').replaceAll('\\','/');
const push=spawnSync(process.execPath,['node_modules/prisma/build/index.js','db','push','--skip-generate'],{env:{...process.env,DATABASE_URL:url},encoding:'utf8',windowsHide:true});assert.equal(push.status,0,push.stdout+push.stderr);
const {PrismaClient}=require('@prisma/client'),db=new PrismaClient({datasources:{db:{url}}});let session=null,renderMode='ok',calls=0;
const env={...process.env,SHOWCASE_STORAGE_DIR:folder,ADMIN_EMAIL:'showcase-admin@example.invalid',NEXTAUTH_URL:'https://showcase.example.invalid'};
const imports={'@/lib/db':{db},'next-auth':{getServerSession:async()=>session},'@/lib/authOptions':{authOptions:{}},'@/lib/rateLimit':{rateLimit:()=>true},'@/public/audio/showcase/manifest.json':require('../public/audio/showcase/manifest.json'),'@/lib/uploadAuthorization':{verifyUpload:(id,user,token)=>token===`signed-${user}-${id}`},'@/lib/storage':{findFileById:async id=>path.join(folder,id+'.wav')},'@/lib/pythonService':{pythonServiceHeaders:()=>({'X-Beatzucker-Service-Token':'test'})}};
function load(file,extra={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:mod.exports,module:mod,require:name=>name in imports?imports[name]:require(name),process:{env,cwd:()=>process.cwd()},console,Buffer,Date,URL,Request,Response,TextDecoder,Uint8Array,AbortSignal,setTimeout,clearTimeout,...extra});return mod.exports;}
imports['@/lib/showcaseTracks']=load('lib/showcaseTracks.ts');imports['@/lib/showcasePublication']=load('lib/showcasePublication.ts');imports['@/lib/adminAccess']=load('lib/adminAccess.ts');imports['@/lib/authRequest']=load('lib/authRequest.ts');
const publication=imports['@/lib/showcasePublication'],valid=imports['@/lib/showcaseTracks'].validShowcaseTrack;
const route=load('app/api/admin/showcase/route.ts',{fetch:async(_,options)=>{
 calls++;if(renderMode==='busy')return Response.json({detail:'busy'},{status:503});
 const input=JSON.parse(options.body),result={};
 for(const side of ['original','master']){const filename=`${input.asset_id}-${side}.mp3`;fs.writeFileSync(path.join(folder,filename),Buffer.alloc(1000,side==='master'?2:1));result[side]={url:'/api/showcase/audio/'+filename,bytes:1000,duration:24,metrics:{lufs:-14,truePeak:-1,crest:9},waveform:Array(128).fill(.5)};}
 if(renderMode==='broken')result.master.waveform=[];
 if(renderMode==='concurrent')await publication.publishShowcase((await publication.readShowcase()).revision,(await publication.readShowcase()).tracks);
 return Response.json(result);
}}),audio=load('app/api/showcase/audio/[asset]/route.ts'),publicRoute=load('app/api/showcase/route.ts');
const request=(body,method='PATCH',origin='https://showcase.example.invalid')=>new Request('https://showcase.example.invalid/api/admin/showcase',{method,headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const getAudio=(asset,range)=>audio.GET(new Request('https://showcase.example.invalid/api/showcase/audio/'+asset,{headers:range?{range}:{}}),{params:Promise.resolve({asset})});
(async()=>{
 const admin=await db.user.create({data:{email:env.ADMIN_EMAIL}}),ordinary=await db.user.create({data:{email:'ordinary@example.invalid'}}),adminSession={user:{id:admin.id,email:admin.email}};
 assert.equal((await route.GET()).status,403);session={user:{id:ordinary.id,email:ordinary.email}};assert.equal((await route.PATCH(request({}))).status,403);session=adminSession;
 const initial=await publication.readShowcase();assert.equal(initial.tracks.length,4);assert.equal(initial.revision,0);
 const first=initial.tracks[0],metadata={revision:0,action:'metadata',id:first.id,title:'New title',genre:'Electronic',position:3};
 assert.equal((await route.PATCH(request(metadata,'PATCH','https://evil.invalid'))).status,403);
 assert.equal((await route.PATCH(request({...metadata,title:'x'.repeat(91)}))).status,400);
 let response=await route.PATCH(request(metadata));assert.equal(response.status,200);let current=await response.json();assert.equal(current.tracks[2].id,first.id);assert.equal(current.tracks[2].title,'New title');assert.deepEqual(current.tracks[2].original,first.original);assert.equal(calls,0);
 assert.equal((await route.PATCH(request(metadata))).status,409);
 console.log('PASS actual admin authorization, origin, metadata/order-only editing and stale edit rejection');
 const id='12345678-1234-4234-8234-123456789abc',upload={file_id:id,upload_token:`signed-${admin.id}-${id}`};
 const body=()=>({revision:current.revision,id:null,title:'Fifth example',genre:'Pop',start:10,publishConsent:true,original:upload,master:upload});
 response=await route.POST(request({...body(),original:{...upload,upload_token:'foreign'}},'POST'));assert.equal(response.status,403);assert.equal(calls,0);
 assert.equal((await route.POST(request({...body(),publishConsent:false},'POST'))).status,400);
 renderMode='broken';response=await route.POST(request(body(),'POST'));assert.equal(response.status,502);assert.equal((await publication.readShowcase()).revision,current.revision);assert.equal(fs.readdirSync(folder).filter(name=>name.endsWith('.mp3')).length,0);
 renderMode='busy';assert.equal((await route.POST(request(body(),'POST'))).status,503);assert.equal((await publication.readShowcase()).tracks.length,4);
 renderMode='ok';response=await route.POST(request(body(),'POST'));assert.equal(response.status,200);current=await response.json();assert.equal(current.tracks.length,5);assert.ok(current.tracks.every(valid));
 const beforeCalls=calls;assert.equal((await route.POST(request(body(),'POST'))).status,400);assert.equal(calls,beforeCalls);
 console.log('PASS upload ownership, rights confirmation, failed pair cleanup, busy admission and hard five-example cap');
 const fifth=current.tracks[4],oldAsset=path.basename(fifth.original.url);response=await getAudio(oldAsset);assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,1000);
 response=await getAudio(oldAsset,'bytes=10-19');assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 10-19/1000');assert.equal((await response.arrayBuffer()).byteLength,10);
 response=await getAudio(oldAsset,'bytes=-12');assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,12);
 for(const range of ['bytes=-','bytes=5000-','bytes=9-2','bytes=-0','bytes=0-1,4-5'])assert.equal((await getAudio(oldAsset,range)).status,416);
 assert.equal((await getAudio('../qa.sqlite')).status,404);
 const secret='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-original.mp3';fs.writeFileSync(path.join(folder,secret),'unpublished');assert.equal((await getAudio(secret)).status,404);
 response=await publicRoute.GET();assert.equal(response.status,200);assert.equal((await response.json()).tracks.length,5);
 console.log('PASS current publication only, bounded MP3 delivery, byte/suffix ranges and invalid ranges/path rejection');
 renderMode='concurrent';response=await route.POST(request({...body(),id:fifth.id},'POST'));assert.equal(response.status,409);current=await publication.readShowcase();assert.equal(current.tracks[4].original.url,fifth.original.url);assert.ok(fs.existsSync(path.join(folder,oldAsset)));
 renderMode='ok';response=await route.POST(request({...body(),id:fifth.id,title:'Replacement'},'POST'));assert.equal(response.status,200);current=await response.json();assert.equal(current.tracks[4].id,fifth.id);assert.notEqual(current.tracks[4].original.url,fifth.original.url);assert.equal(fs.existsSync(path.join(folder,oldAsset)),false);assert.equal((await getAudio(oldAsset)).status,404);
 assert.equal(fs.readdirSync(folder).filter(name=>name.endsWith('.mp3')).length,3); // one intentionally unpublished fixture and current pair
 while(current.tracks.length>1){response=await route.PATCH(request({revision:current.revision,id:current.tracks.at(-1).id,action:'delete'}));assert.equal(response.status,200);current=await response.json();}
 assert.equal((await route.PATCH(request({revision:current.revision,id:current.tracks[0].id,action:'delete'}))).status,400);
 assert.equal((await publication.readShowcase()).tracks.length,1);
 console.log('PASS atomic replacement, revision conflict cleanup, obsolete generated excerpt removal and minimum one example');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
