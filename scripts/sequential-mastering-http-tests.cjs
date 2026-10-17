/* Explicit local QA only. Two supplied source files, no production DB/mail. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{PrismaClient}=require('@prisma/client'),{hashSync}=require('bcryptjs');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated QA flag');
const sources=process.argv.slice(2);if(sources.length!==2||sources.some(p=>!path.isAbsolute(p)||!fs.statSync(p).isFile()))throw Error('Supply two absolute source audio paths');
const platform=process.env.BEATZUCKER_QA_PLATFORM||'spotify',preset=process.env.BEATZUCKER_QA_PRESET||'auto',format=process.env.BEATZUCKER_QA_FORMAT||'wav24';
if(!['spotify','club'].includes(platform)||!['auto','pop'].includes(preset)||!['wav24','mp3320','mp3128'].includes(format))throw Error('Unsupported QA setting');
const presets=(process.env.BEATZUCKER_QA_PRESET_SEQUENCE||[preset,preset,preset].join(',')).split(',');
if(presets.length!==3||presets.some(p=>!['auto','pop'].includes(p)))throw Error('Invalid isolated preset sequence');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'validation-output','tools-audit-20261011','runtime'),database=path.join(folder,'qa.sqlite');
if(!fs.existsSync(database)||fs.realpathSync(folder)!==folder)throw Error('Expected isolated QA database');
const base='http://127.0.0.1:3013',jar=new Map();
async function request(url,options={}){const response=await fetch(base+url,{...options,headers:{Origin:base,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...options.headers},signal:options.signal||AbortSignal.timeout(540000)});for(const raw of response.headers.getSetCookie()){const pair=raw.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1));}return response;}
function client(){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'lib/runMastering.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,fetch:request,TextDecoder,console,process});return module.exports.runMastering;}
(async()=>{
 const db=new PrismaClient({datasources:{db:{url:'file:'+database.replaceAll('\\','/')}}});
 const email='sequential-016-'+Date.now()+'@example.invalid',password='Isolated-Audio-Test-Only!';
 try{
  const user=await db.user.create({data:{email,password:hashSync(password,10),name:'Isolated consecutive mastering QA'}});
  const csrf=await(await request('/api/auth/csrf')).json();const login=await request('/api/auth/callback/credentials',{method:'POST',body:new URLSearchParams({csrfToken:csrf.csrfToken,email,password,json:'true',callbackUrl:base+'/dashboard'})});assert.ok(!(await login.json()).url.includes('error'));
  const jobs=[],bySource=new Map();
  for(const source of sources){const key=fs.realpathSync(source);if(bySource.has(key)){jobs.push(bySource.get(key));continue;}const body=new FormData();body.append('file',new File([fs.readFileSync(source)],path.basename(source),{type:'audio/wav'}));const uploadResponse=await request('/api/upload',{method:'POST',body});assert.equal(uploadResponse.status,200,await uploadResponse.clone().text());const upload=await uploadResponse.json();const analyzed=await request('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(upload)});assert.equal(analyzed.status,200,await analyzed.clone().text());const analysis=await analyzed.json();assert.ok(analysis.analysis_token);jobs.push({fileId:upload.file_id,uploadToken:upload.upload_token,originalName:path.basename(source),analysis});bySource.set(key,jobs.at(-1));}
  const runMastering=client(),results=[];
  // No download, refresh, stream drain or waiting pause between these starts.
  for(let index=0;index<3;index++){const job=jobs[Math.min(index,1)],manual=index===2&&process.env.BEATZUCKER_QA_MANUAL!=='0',jobPreset=presets[index];let result,error;const start=Date.now();await runMastering({...job,platform,preset:jobPreset,intensity:65,selectedFormat:format,lang:'en',...(manual?{overrides:{low_shelf_gain:1.2,bass_mono_amount:.2}}:{}),onProgress:()=>{},onComplete:value=>result=value,onError:value=>error=value});assert.ok(!error,error);assert.ok(result?.master_id);assert.equal(result.params.target_lufs,platform==='club'?-9:-14);assert.equal(result.params.genre,jobPreset==='auto'?'Adaptive':jobPreset);assert.ok(result.post_analysis.true_peak<=-.9);const record=await db.master.findUniqueOrThrow({where:{id:result.master_id}});assert.equal(record.status,'done');assert.equal(record.fileId,job.fileId);if(manual)assert.equal(result.params.bass_mono_amount,.2);results.push(result);console.log(`PASS consecutive ${index+1}/3 ${manual?'manual':'auto'} ${jobPreset} master, correct source, persisted completion, true peak ${result.post_analysis.true_peak.toFixed(2)} dBTP (${((Date.now()-start)/1000).toFixed(1)}s)`);}
  assert.equal(new Set(results.map(r=>r.master_id)).size,3);assert.equal(await db.master.count({where:{userId:user.id,status:'processing'}}),0);
  for(const result of results){const response=await request(result.formats[format]);assert.equal(response.status,200);assert.ok((await response.arrayBuffer()).byteLength>44);}
  console.log('PASS all three private downloads; no leftover processing records. Isolated real-audio QA, no mail sent.');
 }finally{await db.$disconnect();}
})().catch(error=>{console.error(error);process.exitCode=1;});
