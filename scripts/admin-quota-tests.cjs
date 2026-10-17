/* Isolated SQLite, actual route handlers and real bounded JSON; never production. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'validation-output','admin-quota-tests');fs.mkdirSync(folder,{recursive:true});
const filename=path.join(folder,`qa-${process.pid}-${Date.now()}.sqlite`);fs.closeSync(fs.openSync(filename,'wx'));const url='file:'+filename.replaceAll('\\','/');
const legacy=path.join(folder,`legacy-${Date.now()}.prisma`);fs.writeFileSync(legacy,fs.readFileSync('prisma/schema.prisma','utf8').replace(/^model (DailyMasterCharge|ShowcasePublication) \{[\s\S]*?^\}/gm,'').replace(/^.*(?:dailyMasterLimit\s+Int\?|dailyCharges\s+DailyMasterCharge\[\]|dailyCharge\s+DailyMasterCharge\?).*\r?\n/gm,''));
function push(schema){const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','db','push','--skip-generate',...(schema?['--schema',schema]:[])],{cwd:root,env:{...process.env,DATABASE_URL:url},encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stdout+result.stderr);}
push(legacy);const {PrismaClient}=require('@prisma/client'),db=new PrismaClient({datasources:{db:{url}}});
let session=null,serviceCalls=0;
const env={...process.env,ADMIN_EMAIL:'qa-admin@example.invalid',NEXTAUTH_URL:'https://quota.example.invalid'};
const imports={'@/lib/db':{db},'@/lib/authOptions':{authOptions:{}},'next-auth':{getServerSession:async()=>session},'next-auth/next':{getServerSession:async()=>session},'@/lib/rateLimit':{rateLimit:()=>true}};
function load(file,overrides={},extra={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:name=>name in overrides?overrides[name]:name in imports?imports[name]:require(name),process:{env},console,Buffer,Date,Request,Response,ReadableStream,TextEncoder,TextDecoder,Uint8Array,AbortSignal,setTimeout,clearTimeout,setInterval,clearInterval,URL,...extra});return mod.exports;}
imports['@/lib/constants']=load('lib/constants.ts');imports['@/lib/masterQuota']=load('lib/masterQuota.ts');imports['@/lib/adminAccess']=load('lib/adminAccess.ts');imports['@/lib/authRequest']=load('lib/authRequest.ts');
const {dailyMasterLimit,validDailyMasterLimit,usedDailyMasters,startOfMasteringDay}=imports['@/lib/masterQuota'];
const admin=load('app/api/admin/user-limit/route.ts');
const request=(body,origin='https://quota.example.invalid')=>new Request('https://quota.example.invalid/api/admin/user-limit',{method:'PATCH',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
const runPatch=body=>admin.PATCH(request(body));
(async()=>{
 await db.$executeRawUnsafe("INSERT INTO User (id,email,updatedAt) VALUES ('legacy','legacy@example.invalid',CURRENT_TIMESTAMP)");push();assert.equal((await db.user.findUnique({where:{id:'legacy'}})).dailyMasterLimit,null);
 console.log('PASS nullable daily-limit migration preserves an existing account and inherits the default');
 await db.$executeRawUnsafe("INSERT INTO User (id,email,updatedAt) VALUES ('old-code-write','old-code@example.invalid',CURRENT_TIMESTAMP)");assert.equal((await db.user.findUnique({where:{id:'old-code-write'}})).dailyMasterLimit,null);
 console.log('PASS old-style account inserts remain valid after additive schema update');
 const actor=await db.user.create({data:{email:env.ADMIN_EMAIL}}),user=await db.user.findUnique({where:{id:'legacy'}});const actorSession={user:{id:actor.id,email:actor.email}},userSession={user:{id:user.id,email:user.email}};
 assert.equal((await runPatch({userId:user.id,dailyMasterLimit:25})).status,403);session=userSession;assert.equal((await runPatch({userId:user.id,dailyMasterLimit:25})).status,403);
 session=actorSession;assert.equal((await admin.PATCH(request({userId:user.id,dailyMasterLimit:25},'https://evil.invalid'))).status,403);
 for(const value of [-1,1001,1.5,'25',true,{},undefined])assert.equal((await runPatch({userId:user.id,dailyMasterLimit:value})).status,400);
 assert.equal((await runPatch({userId:user.id,dailyMasterLimit:25,padding:'x'.repeat(9000)})).status,413);assert.equal((await runPatch({userId:'missing',dailyMasterLimit:25})).status,404);
 for(const value of [0,25,1000,null]){const response=await runPatch({userId:user.id,dailyMasterLimit:value,role:'admin'});assert.equal(response.status,200);assert.equal((await response.json()).dailyLimit,value??10);assert.equal((await db.user.findUnique({where:{id:user.id}})).dailyMasterLimit,value);}
 assert.equal(dailyMasterLimit(0),0);assert.equal(dailyMasterLimit(null),10);assert.equal(validDailyMasterLimit('10'),false);
 console.log('PASS actual admin guard, origin, bounded JSON, strict limits, reset-to-default and missing user');
 const create=(status,date=new Date())=>db.master.create({data:{userId:user.id,fileId:'fixture-file',originalName:'fixture.wav',platform:'spotify',preset:'auto',status,createdAt:date}});
 const old=await create('done'),second=await create('done');await create('error');const yesterday=new Date(startOfMasteringDay().getTime()-1000);await create('done',yesterday);assert.equal(await usedDailyMasters(db,user.id),2);
 const processing=await create('processing');await db.dailyMasterCharge.create({data:{id:processing.id,masterId:processing.id,userId:user.id,day:startOfMasteringDay()}});assert.equal(await usedDailyMasters(db,user.id),3);await db.master.update({where:{id:processing.id},data:{status:'error'}});assert.equal(await usedDailyMasters(db,user.id),2);
 const deletion=load('app/api/master/[id]/route.ts',{'@/lib/storage':{removeMasterFiles:async()=>{}}});session=userSession;
 const del=id=>deletion.DELETE(new Request('https://quota.example.invalid/api/master/'+id,{method:'DELETE'}),{params:Promise.resolve({id})});
 assert.equal((await del(old.id)).status,200);assert.equal(await db.master.findUnique({where:{id:old.id}}),null);assert.equal(await usedDailyMasters(db,user.id),2);assert.equal((await db.dailyMasterCharge.findUnique({where:{id:old.id}})).masterId,null);
 assert.equal((await del(processing.id)).status,200);assert.equal(await usedDailyMasters(db,user.id),2);
 const running=await create('processing');assert.equal((await del(running.id)).status,409);await db.master.update({where:{id:running.id},data:{status:'error'}});
 console.log('PASS used quota survives history deletion; errors and yesterday do not count; processing cannot be deleted');
 const fileId='11223344-5566-4788-99aa-bbccddeeff00';
 const master=load('app/api/master/route.ts',{'@/lib/boundedJson':load('lib/boundedJson.ts'),'@/lib/dspAdmissionRetry':load('lib/dspAdmissionRetry.ts'),'@/lib/email':{sendMasteringCompleteEmail:async()=>{},sendMasteringErrorEmail:async()=>{}},'@/lib/analysisValidation':{normalizeAnalysis:x=>x,normalizeReferenceAnalysis:x=>x,verifyAnalysis:()=>true},'@/lib/uploadAuthorization':{verifyUpload:()=>true},'@/lib/storage':{findExistingMasterFormats:()=>['wav24'],removeMasterFiles:async()=>{}},'@/lib/filename':{sanitizeOriginalFilename:()=> 'fixture.wav'},'@/lib/masteringParams':{normalizeParamOverrides:x=>x},'@/lib/pythonService':{pythonServiceHeaders:()=>({})},fs:{existsSync:()=>true},'fs/promises':{readdir:async()=>[fileId+'.wav'],stat:async()=>({isFile:()=>true,size:100})}},{fetch:async(_,options)=>{serviceCalls++;const input=JSON.parse(options.body);return new Response('data: '+JSON.stringify({step:'complete',master_id:input.master_id,selected_format:'wav24',post_analysis:{integrated_lufs:-14}})+'\n\n');}});
 const send=extra=>master.POST(new Request('https://quota.example.invalid/api/master',{method:'POST',body:JSON.stringify({file_id:fileId,upload_token:'fixture',format:'wav24',platform:'spotify',preset:'auto',...extra})}));
 session=actorSession;await runPatch({userId:user.id,dailyMasterLimit:2});session=userSession;let blocked=await send({dailyLimit:1000});assert.equal(blocked.status,429);assert.equal((await blocked.json()).used,2);assert.equal(serviceCalls,0);
 session=actorSession;await runPatch({userId:user.id,dailyMasterLimit:3});session=userSession;const allowed=await send();assert.equal(allowed.status,200);assert.match(await allowed.text(),/"step":"complete"/);assert.equal(await usedDailyMasters(db,user.id),3);assert.equal((await send()).status,429);
 session=actorSession;await runPatch({userId:user.id,dailyMasterLimit:25});session=userSession;const manual=await send({overrides:{air_gain:1}});assert.match(await manual.text(),/"step":"complete"/);assert.equal(await usedDailyMasters(db,user.id),4);
 session=actorSession;await runPatch({userId:user.id,dailyMasterLimit:0});session=userSession;blocked=await send();assert.equal(blocked.status,429);assert.equal((await blocked.json()).limit,0);assert.equal(serviceCalls,2);
 console.log('PASS actual quota reservations: raise applies immediately, manual masters count, zero blocks DSP, forged limits ignored');
 session=actorSession;await runPatch({userId:user.id,dailyMasterLimit:null});await db.master.deleteMany({where:{userId:user.id}});assert.ok(await db.dailyMasterCharge.count({where:{userId:user.id}})>0);await db.user.delete({where:{id:user.id}});assert.equal(await db.dailyMasterCharge.count({where:{userId:user.id}}),0);
 console.log('PASS reset to default and account-erasure cascade; no production files or mail');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
