// API/contract checks; production DB, audio, mail and network are never used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={},extra={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:name=>name in imports?imports[name]:require(name),process,Buffer,URL,Response,Request,AbortSignal,TextDecoder,Uint8Array,setTimeout,clearTimeout,...extra});return module.exports;}
let passed=0;async function test(name,fn){await fn();console.log('PASS '+name);passed++;}
(async()=>{
 const validator=load('lib/analysisValidation.ts'),params=load('lib/masteringParams.ts');
 const a={integrated_lufs:-18,true_peak:-5,dr_value:10,crest_factor:10,lra:8,rms_sub:-28,rms_low:-23,rms_mid:-22,rms_high:-28,rms_air:-38,spectral_centroid:2600,spectral_rolloff:8000,spectral_flatness:.2,stereo_width:.4,mono_compatibility:.7,bpm:120,key:'A minor',transient_density:1,dc_offset:0,duration_seconds:60,sample_rate:48000,bit_depth:24,channels:2,clipping_detected:false};
 const previous=process.env.ANALYSIS_SIGNING_SECRET;process.env.ANALYSIS_SIGNING_SECRET='isolated-tests-only-not-a-production-secret';
 const id='11223344-5566-4788-99aa-bbccddeeff00';
 await test('old signed analyses remain valid; optional bass metrics are validated and signed',()=>{
   const old=validator.signAnalysis(id,a);assert.equal(validator.verifyAnalysis(id,validator.normalizeAnalysis(a),old),true);
   const next={...a,bass_correlation:-.5,bass_side_ratio:2};const token=validator.signAnalysis(id,next);assert.equal(validator.verifyAnalysis(id,validator.normalizeAnalysis(next),token),true);
   assert.equal(validator.verifyAnalysis(id,{...next,bass_correlation:0},token),false);
   assert.equal(validator.normalizeAnalysis({...a,bass_correlation:NaN}),null);assert.equal(validator.normalizeAnalysis({...a,bass_side_ratio:21}),null);
 });
 await test('manual bass control has identical client/server ranges and does not expose limiter ceilings',()=>{
   assert.deepEqual(JSON.parse(JSON.stringify(params.normalizeParamOverrides({bass_mono_amount:.4}))),{bass_mono_amount:.4});
   assert.equal(params.normalizeParamOverrides({bass_mono_amount:2}),null);assert.equal(params.normalizeParamOverrides({true_peak_ceiling:1}),null);
   const source=fs.readFileSync('python/ai_params.py','utf8');assert.match(source,/"bass_mono_amount":\s*\(0\.0,\s*1\.0\)/);
 });
 let session={user:{id:'fixture'}},exists=true,allow=true,workerCalls=0,escaped=false;
 const base=new URL(process.env.NEXTAUTH_URL||'https://beatzucker.de').origin;
 const route=load('app/api/control-preview/route.ts',{
   'next-auth/next':{getServerSession:async()=>session},'@/lib/authOptions':{authOptions:{}},'@/lib/db':{db:{user:{findUnique:async()=>exists?{id:'fixture'}:null}}},
   '@/lib/uploadAuthorization':{verifyUpload:(_,owner,token)=>owner==='fixture'&&token==='upload-fixture'},'@/lib/analysisValidation':validator,'@/lib/masteringParams':params,
   '@/lib/boundedJson':load('lib/boundedJson.ts'),'@/lib/pythonService':{pythonServiceHeaders:()=>({'X-Beatzucker-Service-Token':'fixture-internal'})},'@/lib/rateLimit':{rateLimit:()=>allow},
   'fs/promises':{readdir:async()=>[id+'.wav'],realpath:async target=>escaped&&String(target).endsWith('.wav')?path.resolve('outside-fixture.wav'):path.resolve(target)},
 },{fetch:async(url,options)=>{workerCalls++;const body=JSON.parse(options.body);assert.equal(body.start,2);assert.equal(body.end,10);assert.equal(body.overrides.bass_mono_amount,.4);assert.ok(!('output_dir'in body));return new Response(new Uint8Array([82,73,70,70]),{headers:{'Content-Type':'audio/wav'}})}});
 const valid={file_id:id,upload_token:'upload-fixture',analysis:{...a,analysis_token:validator.signAnalysis(id,a)},platform:'spotify',preset:'auto',intensity:65,start:2,end:10,overrides:{bass_mono_amount:.4}};
 const send=(value=valid,origin=base)=>route.POST(new Request(base+'/api/control-preview',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)}));
 await test('guests, deleted accounts, foreign origins and foreign upload tokens cannot render',async()=>{
   session=null;assert.equal((await send()).status,401);session={user:{id:'fixture'}};exists=false;assert.equal((await send()).status,401);exists=true;
   assert.equal((await send(valid,'https://foreign.invalid')).status,403);assert.equal((await send({...valid,upload_token:'foreign'})).status,403);assert.equal(workerCalls,0);
 });
 await test('control render requires signed analysis, finite bounded selection and safe overrides',async()=>{
   for(const change of[{analysis:{...a,analysis_token:'bad'}},{start:-1},{end:50},{end:2.1},{intensity:101},{overrides:{true_peak_ceiling:5}},{platform:'bad'},{platform:'custom',target_lufs:0},{start:'2'}])assert.equal((await send({...valid,...change})).status,400);
   assert.equal(workerCalls,0);
 });
 await test('bounded JSON, rate limit and realpath checks reject abuse before DSP',async()=>{
   assert.equal((await send({...valid,padding:'x'.repeat(17000)})).status,413);
   allow=false;assert.equal((await send()).status,429);allow=true;escaped=true;assert.equal((await send()).status,403);escaped=false;assert.equal(workerCalls,0);
 });
 await test('authorized bounded render forwards only validated settings and returns private WAV',async()=>{
   const response=await send();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('content-type'),'audio/wav');assert.equal((await response.arrayBuffer()).byteLength,4);assert.equal(workerCalls,1);
   const source=fs.readFileSync('app/api/control-preview/route.ts','utf8');assert.ok(!source.includes('db.master.create'));assert.ok(!source.includes('sendMastering'));
 });
 await test('manual UI invalidates stale control renders and labels section/export differences honestly',()=>{
   const source=fs.readFileSync('components/ManualAdjustModal.tsx','utf8');assert.ok(source.includes('controller.signal.aborted'));assert.ok(source.includes('URL.revokeObjectURL(controlUrl)'));assert.ok(source.includes('controlKey, open'));assert.ok(source.includes('kein identischer Ausschnitt'));assert.ok(source.includes('not an identical excerpt'));assert.ok(source.includes('Ausgangswerte'));assert.ok(source.includes('Base settings'));
 });
 let clipCalls=0;
 const clip=load('app/api/preview-section/route.ts',{
   'next-auth/next':{getServerSession:async()=>session},'@/lib/authOptions':{authOptions:{}},
   '@/lib/uploadAuthorization':{verifyUpload:(_,owner,token)=>owner==='fixture'&&token==='upload-fixture'},
   '@/lib/boundedJson':load('lib/boundedJson.ts'),'@/lib/pythonService':{pythonServiceHeaders:()=>({})},'@/lib/rateLimit':{rateLimit:()=>allow},
   'fs/promises':{readdir:async()=>[id+'.wav'],realpath:async target=>escaped&&String(target).endsWith('.wav')?path.resolve('outside-fixture.wav'):path.resolve(target)},
 },{fetch:async()=>{clipCalls++;return new Response(new Uint8Array([82,73,70,70]));}});
 const clipBody={file_id:id,upload_token:'upload-fixture',start:2,end:10};
 const sendClip=(body=clipBody,origin=base)=>clip.POST(new Request(base+'/api/preview-section',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 await test('buffered source rejects guests, foreign uploads, origins, invalid regions and oversized bodies',async()=>{
   session=null;assert.equal((await sendClip()).status,401);session={user:{id:'fixture'}};
   assert.equal((await sendClip(clipBody,'https://foreign.invalid')).status,403);
   assert.equal((await sendClip({...clipBody,upload_token:'foreign'})).status,403);
   for(const change of[{start:-1},{end:50},{end:2},{start:'2'},{file_id:'../escape'}])assert.equal((await sendClip({...clipBody,...change})).status,400);
   assert.equal((await sendClip({...clipBody,padding:'x'.repeat(3000)})).status,413);
   allow=false;assert.equal((await sendClip()).status,429);allow=true;escaped=true;assert.equal((await sendClip()).status,403);escaped=false;assert.equal(clipCalls,0);
 });
 await test('buffered source returns private WAV without writing master history',async()=>{
   const response=await sendClip();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.arrayBuffer()).byteLength,4);assert.equal(clipCalls,1);
   assert.ok(!fs.readFileSync('app/api/preview-section/route.ts','utf8').includes('db.master.create'));
 });
 if(previous===undefined)delete process.env.ANALYSIS_SIGNING_SECRET;else process.env.ANALYSIS_SIGNING_SECRET=previous;
 console.log(passed+' mastering request/preview checks passed; no production requests.');
})().catch(error=>{console.error(error);process.exitCode=1});
