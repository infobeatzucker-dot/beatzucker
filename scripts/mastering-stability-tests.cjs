/* Isolated orchestration regressions. No real DB, files, DSP or mail. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={},globals={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:name=>name in imports?imports[name]:require(name),console,process,Buffer,URL,Response,Request,ReadableStream,TextEncoder,TextDecoder,Uint8Array,AbortController,AbortSignal,setTimeout,clearTimeout,setInterval,clearInterval,...globals});return module.exports;}
const watchdog=setTimeout(()=>{console.error('FAIL stability checks stalled');process.exit(1);},10000);
(async()=>{
 const {MasteringRun}=load('lib/masteringRun.ts'),gate=new MasteringRun();
 const a=gate.start();assert.ok(a.current());assert.equal(gate.start(),null);gate.reset();const b=gate.start();assert.ok(a.signal.aborted);assert.ok(!a.current());a.finish();assert.ok(b.current());assert.equal(gate.start(),null);b.finish();assert.ok(gate.start());
 console.log('PASS synchronous duplicate protection; old callbacks/finalizers cannot replace a new track');
 const retry=load('lib/dspAdmissionRetry.ts',{}, {setTimeout:fn=>setTimeout(fn,2)}).withDspAdmissionRetry;
 let attempts=0,waits=0;const signal=new AbortController().signal;
 const admitted=await retry(async()=>++attempts<3?new Response('{}',{status:503,headers:{'Retry-After':'15'}}):new Response('accepted'),signal,()=>waits++);
 assert.equal(admitted.status,200);assert.equal(attempts,3);assert.equal(waits,2);
 attempts=0;assert.equal((await retry(async()=>{attempts++;return new Response('{}',{status:503,headers:{'Retry-After':'15'}});},signal)).status,503);assert.equal(attempts,3);
 for(const status of[200,500,503]){attempts=0;await retry(async()=>{attempts++;return new Response('{}',{status});},signal);assert.equal(attempts,1);}
 attempts=0;await assert.rejects(retry(async()=>{attempts++;throw Error('ambiguous connection failure');},signal),/ambiguous/);assert.equal(attempts,1);
 const abort=new AbortController();await assert.rejects(retry(async()=>new Response('{}',{status:503,headers:{'Retry-After':'15'}}),abort.signal,()=>abort.abort()));
 console.log('PASS bounded admission-only retries; accepted jobs, ambiguous failures and aborts are never re-submitted');
 let cancel=0,release=0,complete=0,error='',mode='complete';
 const {runMastering}=load('lib/runMastering.ts',{}, {fetch:async()=>({ok:true,body:{getReader:()=>({read:async()=>({done:false,value:new TextEncoder().encode('data: '+JSON.stringify(mode==='complete'?{step:'complete',master_id:'fixture'}:{step:'error',error:'Mastering failed',error_code:'memory',master_id:'12345678-full-id'})+'\n\n')}),cancel:async()=>cancel++,releaseLock:()=>release++})}})});
 const args={fileId:'fixture',uploadToken:'fixture',platform:'spotify',preset:'auto',intensity:65,selectedFormat:'wav24',onProgress:()=>{},onComplete:()=>complete++,onError:message=>error=message};
 await runMastering(args);await runMastering(args);assert.equal(complete,2);assert.equal(cancel,2);assert.equal(release,2);mode='error';await runMastering({...args,lang:'en'});assert.match(error,/memory/);assert.match(error,/12345678/);assert.equal(cancel,3);assert.equal(release,3);
 console.log('PASS consecutive client SSE completions/errors release reader and show bilingual reason/reference');
 const id='11223344-5566-4788-99aa-bbccddeeff00',records=new Map();let sequence=0,upstreamCancelled=0,mailCalls=0,service='ok';
 const master={count:async({where})=>[...records.values()].filter(r=>typeof where.status==='string'?r.status===where.status:['done','processing'].includes(r.status)).length,create:async({data})=>{const r={...data,id:'fixture-master-'+(++sequence)};records.set(r.id,r);return r;},update:async({where,data})=>Object.assign(records.get(where.id),data),findUnique:async({where})=>records.get(where.id)};
 const route=load('app/api/master/route.ts',{
  '@/lib/dspAdmissionRetry':load('lib/dspAdmissionRetry.ts'),
  'next-auth/next':{getServerSession:async()=>({user:{id:'fixture'}})},'@/lib/authOptions':{authOptions:{}},'@/lib/db':{db:{$transaction:fn=>fn({master}),master,user:{findUnique:async()=>({email:'fixture@example.invalid'})}}},
  '@/lib/rateLimit':{rateLimit:()=>true},'@/lib/email':{sendMasteringCompleteEmail:()=>{mailCalls++;return new Promise(()=>{});},sendMasteringErrorEmail:async()=>{}},'@/lib/constants':{DAILY_MASTER_LIMIT:10},
  '@/lib/analysisValidation':{normalizeAnalysis:x=>x,normalizeReferenceAnalysis:x=>x,verifyAnalysis:()=>true},'@/lib/uploadAuthorization':{verifyUpload:()=>true},'@/lib/storage':{findExistingMasterFormats:()=>['wav24'],removeMasterFiles:async()=>{}},'@/lib/filename':{sanitizeOriginalFilename:x=>x},'@/lib/masteringParams':{normalizeParamOverrides:x=>x},'@/lib/pythonService':{pythonServiceHeaders:()=>({})},'@/lib/boundedJson':load('lib/boundedJson.ts'),
  fs:{existsSync:()=>true},'fs/promises':{readdir:async()=>[id+'.wav'],stat:async()=>({isFile:()=>true,size:100})},
 },{fetch:async(_,options)=>{if(service==='busy')return new Response('{}',{status:503});const body=JSON.parse(options.body);return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({step:'complete',master_id:body.master_id,selected_format:'wav24',post_analysis:{integrated_lufs:-14}})+'\n\n'));},cancel(){upstreamCancelled++;}}));}});
 const send=()=>route.POST(new Request('http://localhost/api/master',{method:'POST',body:JSON.stringify({file_id:id,upload_token:'fixture',platform:'spotify',preset:'auto',format:'wav24',original_name:'fixture.wav'})}));
 for(let i=0;i<2;i++){const response=await send();assert.equal(response.status,200);const text=await response.text();assert.match(text,/"step":"complete"/);assert.equal(records.get('fixture-master-'+(i+1)).status,'done');}
 assert.equal(mailCalls,2);assert.equal(upstreamCancelled,2);
 console.log('PASS immediate second server master, persisted results and upstream cleanup despite indefinitely pending mail');
 service='busy';const text=await(await send()).text();assert.match(text,/"error_code":"busy"/);assert.equal(records.get('fixture-master-3').status,'error');assert.ok(!text.includes('Mastering-Service nicht erreichbar'));
 service='ok';assert.match(await(await send()).text(),/"step":"complete"/);
 console.log('PASS capacity rejection releases account reservation; a later retry succeeds without auto-duplicating jobs');
 const workspace=fs.readFileSync('components/MasteringWorkspace.tsx','utf8'),upload=fs.readFileSync('components/UploadZone.tsx','utf8');
 assert.ok(workspace.includes('key={uploadCycle}'));assert.ok(workspace.includes('signal: run.signal'));assert.ok(workspace.includes('if (run.current())'));assert.ok(upload.includes('controller.signal.aborted'));assert.ok(upload.includes('clearInterval(analyzeTimer)'));
 console.log('6 mastering stability regression groups passed.');clearTimeout(watchdog);
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exitCode=1;});
