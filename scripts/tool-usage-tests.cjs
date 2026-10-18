const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{spawnSync}=require('node:child_process');
function load(file,modules){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>{if(name in modules)return modules[name];throw Error(name)},Date,Intl,URL,process,AbortSignal,globalThis: {crypto:require('node:crypto').webcrypto},crypto:require('node:crypto').webcrypto});return module.exports;}
const folder=path.resolve('validation-output/tool-usage-tests');fs.mkdirSync(folder,{recursive:true});
const filename=path.join(folder,`qa-${Date.now()}-${process.pid}.sqlite`);fs.closeSync(fs.openSync(filename,'wx'));
const url='file:'+filename.replaceAll('\\','/');
const pushed=spawnSync(process.execPath,['node_modules/prisma/build/index.js','db','push','--skip-generate'],{env:{...process.env,DATABASE_URL:url},encoding:'utf8',windowsHide:true});assert.equal(pushed.status,0,pushed.stderr);
const {PrismaClient}=require('@prisma/client'),db=new PrismaClient({datasources:{db:{url}}});
(async()=>{
 const usage=load('lib/toolUsage.ts',{'@/lib/db':{db}});
 assert.equal(usage.USAGE_TOOLS.length,13);assert.equal(usage.usageDay(new Date('2026-10-13T23:30:00Z')),'2026-10-14');assert.equal(usage.usageCutoff(7,new Date('2026-10-13T23:30:00Z')),'2026-10-08');
 const id=require('node:crypto').randomUUID();assert.ok(usage.validUsage({id,tool:'mix-check',outcome:'started'}));assert.ok(!usage.validUsage({id,tool:'unknown',outcome:'started'}));assert.ok(!usage.validUsage({id:'bad',tool:'mix-check',outcome:'error'}));
 console.log('PASS thirteen tools, bounded allowlists and Berlin day boundaries');
 await db.toolUsage.create({data:{id:require('node:crypto').randomUUID(),day:'2000-01-01',tool:'mix-check',outcome:'started'}});
 await usage.recordToolUsage(id,'mix-check','started');await usage.recordToolUsage(id,'mix-check','started');assert.equal(await db.toolUsage.count(),1);
 await usage.recordToolUsage(id,'key-bpm','error');assert.equal((await db.toolUsage.findUnique({where:{id}})).outcome,'started');
 await usage.recordToolUsage(id,'mix-check','completed');await usage.recordToolUsage(id,'mix-check','error');assert.equal((await db.toolUsage.findUnique({where:{id}})).outcome,'completed');
 console.log('PASS real SQLite cleanup, duplicate suppression, tool mismatch and first terminal outcome');
 let allowed=false;
 const route=load('app/api/admin/tool-usage/route.ts',{'next/server':{NextResponse:Response},'next-auth':{getServerSession:async()=>null},'@/lib/authOptions':{authOptions:{}},'@/lib/adminAccess':{requireAdmin:async()=>allowed},'@/lib/db':{db},'@/lib/toolUsage':usage});
 assert.equal((await route.GET(new Request('http://localhost/api/admin/tool-usage'))).status,403);allowed=true;
 assert.equal((await route.GET(new Request('http://localhost/api/admin/tool-usage?days=999'))).status,400);
 const result=await route.GET(new Request('http://localhost/api/admin/tool-usage?days=7'));assert.match(result.headers.get('cache-control'),/no-store/);const data=await result.json();assert.equal(data.rows.length,1);assert.equal(data.rows[0].count,1);
 console.log('PASS protected aggregate API, permitted periods and uncached counts');
 const guard=load('lib/adminAccess.ts',{'@/lib/db':{db:{user:{findUnique:async()=>({id:'admin'})}}}});const previous=process.env.ADMIN_EMAIL;process.env.ADMIN_EMAIL='admin@example.invalid';assert.equal(await guard.requireAdmin(null),false);assert.equal(await guard.requireAdmin({user:{email:'other@example.invalid'}}),false);assert.equal(await guard.requireAdmin({user:{email:'admin@example.invalid'}}),true);if(previous===undefined)delete process.env.ADMIN_EMAIL;else process.env.ADMIN_EMAIL=previous;
 console.log('PASS real admin guard denies guests and ordinary accounts');
 const api=load('app/api/tool-usage/route.ts',{'next/server':{NextResponse:Response},'@/lib/boundedJson':{JsonBodyError:class extends Error{},readBoundedJson:async request=>request.json()},'@/lib/rateLimit':{rateLimit:()=>true},'@/lib/toolUsage':usage});
 const expected=new URL(process.env.NEXTAUTH_URL||'https://beatzucker.de').origin;
 assert.equal((await api.POST(new Request(expected+'/api/tool-usage',{method:'POST',headers:{origin:'https://evil.invalid'},body:'{}'}))).status,403);
 assert.equal((await api.POST(new Request(expected+'/api/tool-usage',{method:'POST',headers:{origin:expected},body:JSON.stringify({id,tool:'not-a-tool',outcome:'started'})}))).status,400);
 assert.equal((await api.POST(new Request(expected+'/api/tool-usage',{method:'POST',headers:{origin:expected},body:JSON.stringify({id,tool:'mix-check',outcome:'started'})}))).status,204);
 console.log('PASS telemetry origin and input validation without duplicate writes');
 // Execute hook effects with persistent refs and no browser/production service.
 let cursor=0,refs=[],effects=[],cleanup=[],sent=[];
 // fetch is added to this separate VM through a small wrapper.
 const source=fs.readFileSync('lib/useToolUsage.ts','utf8');
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:()=>({useRef:value=>{const index=cursor++;return refs[index]??(refs[index]={current:value})},useEffect:(fn,deps)=>{if(deps.length)effects.push(fn);else if(!cleanup.length)cleanup.push(fn())}}),fetch:async(url,options)=>{sent.push(JSON.parse(options.body));return new Response(null,{status:204})},globalThis:{crypto:require('node:crypto').webcrypto},crypto:require('node:crypto').webcrypto,AbortSignal});
 function render(enabled,busy,complete,incomplete=false,error){cursor=0;effects=[];module.exports.useToolUsage('mix-check',enabled,busy,complete,incomplete,error);effects.forEach(fn=>fn());}
 render(false,true,false);render(false,false,true);assert.equal(sent.length,0);
 render(true,true,false);render(true,false,true);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(sent.map(item=>item.outcome),['started','completed']);assert.equal(sent[0].id,sent[1].id);
 render(true,false,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(sent.length,2);
 render(true,true,false);render(true,false,true,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(sent.at(-1).outcome,'partial');
 render(true,true,false);render(true,false,false,false,'failure');await new Promise(resolve=>setImmediate(resolve));assert.equal(sent.at(-1).outcome,'error');
 console.log('PASS actual client hook excludes second panel, serializes events, avoids repeated completion and records partial/error');
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const guides=load('lib/toolGuidance.ts',{}).TOOL_GUIDES;
 function renderPanel(lang,rows,busy=false,error=''){
   let index=0;const values=[7,0,rows,'2026-10-14',busy,error],module={exports:{}};
   vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/admin/ToolUsageStats.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,Date,fetch:()=>{throw Error('Unexpected fetch in SSR')},require:name=>name==='react'?{...React,useState:()=>[values[index++],()=>{}],useEffect:()=>{}}:name==='@/lib/toolGuidance'?{TOOL_GUIDES:guides}:name==='@/lib/useUiLanguage'?{useUiLanguage:()=>lang}:require(name)});
   return renderToStaticMarkup(React.createElement(module.exports.default));
 }
 const fixture=[{day:'2026-10-14',tool:'mix-check',outcome:'completed',count:2},{day:'2026-10-14',tool:'mix-check',outcome:'error',count:1}];
 for(const lang of ['de','en']){const markup=renderPanel(lang,fixture);assert.ok(!markup.includes('NaN'));assert.match(markup,/2026-10-08/);assert.equal((markup.match(/scope="row"/g)||[]).length,13);assert.match(markup,/<td>3<\/td><td>2<\/td><td>0<\/td><td>1<\/td>/);assert.match(renderPanel(lang,[]),lang==='de'?/noch keine Vorgänge/:/No reported operations/);assert.match(renderPanel(lang,[],false,'Unavailable'),/Unavailable/);assert.ok(!renderPanel(lang,fixture,true).includes('<table>'));}
 console.log('PASS DE/EN admin rendering, thirteen tool rows, totals, zero days, loading and error states');
 console.log('7 tool usage checks passed; isolated SQLite only, no production requests.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect());
