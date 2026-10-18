// Execute actual Next handler source with controlled session/DB/private-worker fixtures.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const {NextRequest} = require('next/server');
let user = {id:'fixture-user',passwordChangedAt:null,vocalRemoverEnabled:false,stemSeparationEnabled:false};
let session = {user:{id:user.id},passwordVersion:0}, admin = false, calls = [], jobMode = 'full', tool = 'stem-separation';
const env = {STEM_TOOLS_ENABLED:'true',STEM_WORKER_URL:'http://private-worker.invalid',STEM_WORKER_SECRET:'isolated-fixture-only-123456789012345678',NEXTAUTH_URL:'http://localhost:3013'};
const cache = new Map();
const db = {user:{findUnique:async()=>({...user}),updateMany:async({data})=>{assert.deepEqual(Object.keys(data).sort(),['stemSeparationEnabled','vocalRemoverEnabled']);Object.assign(user,data);return {count:1}}}};
function load(file){
 if(cache.has(file)) return cache.get(file);
 const mod={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module:mod,exports:mod.exports,process:{env},Headers,Response,Request,File,Blob,FormData,Uint8Array,TextDecoder,URL,AbortSignal,setTimeout,clearTimeout,globalThis:{},console,
 fetch:async(url,init)=>{calls.push({url,init});assert.match(init.headers.get('X-Owner'),/^[a-f0-9]{64}$/);assert.equal(init.headers.get('Authorization'),'Bearer '+env.STEM_WORKER_SECRET);return url.includes('/audio/')?new Response('private-audio'):Response.json({id:'a'.repeat(32),mode:jobMode,tool,status:'done',stems:['vocals']})},
 require:name=>name==='next-auth'?{getServerSession:async()=>session}:['@/lib/authOptions','./authOptions'].includes(name)?{authOptions:{}}:['@/lib/db','./db'].includes(name)?{db}:name==='@/lib/adminAccess'?{requireAdmin:async()=>admin}:name==='@/lib/rateLimit'?{rateLimit:()=>true}:name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('./')?load('lib/'+name.slice(2)+'.ts'):require(name)
 });cache.set(file,mod.exports);return mod.exports;
}
(async()=>{
 const route=load('app/api/stems/route.ts'), access=load('app/api/admin/stem-access/route.ts');
 const get=()=>new NextRequest('http://localhost:3013/api/stems?id='+ 'a'.repeat(32)+'&asset=vocals');
 session=null;assert.equal((await route.GET(get())).status,401);session={user:{id:user.id},passwordVersion:0};
 assert.equal((await route.GET(get())).status,403);assert.equal(calls.length,1,'No full asset should be fetched');
 user.stemSeparationEnabled=true;assert.equal((await route.GET(get())).status,200);
 user.stemSeparationEnabled=false;assert.equal((await route.GET(get())).status,403,'Revocation is checked on every fetch');
 user.vocalRemoverEnabled=true;assert.equal((await route.GET(get())).status,403,'Permissions are independent');
 tool='vocal-remover';assert.equal((await route.GET(get())).status,200);
 jobMode='preview';user.vocalRemoverEnabled=false;assert.equal((await route.GET(get())).status,200);
 const form=new FormData();form.set('file',new File(['RIFFfixture'],'source.wav'));form.set('tool','stem-separation');form.set('mode','full');
 const before=calls.length;assert.equal((await route.POST(new NextRequest('http://localhost:3013/api/stems',{method:'POST',body:form}))).status,403);assert.equal(calls.length,before);
 user.passwordChangedAt=new Date(1000);assert.equal((await route.GET(get())).status,401);user.passwordChangedAt=null;
 const req=(origin='http://localhost:3013')=>new NextRequest('http://localhost:3013/api/admin/stem-access',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({userId:user.id,vocalRemoverEnabled:true,stemSeparationEnabled:false})});
 assert.equal((await access.PATCH(req())).status,403);admin=true;
 assert.equal((await access.PATCH(req('https://attacker.invalid'))).status,403);
 assert.equal((await access.PATCH(req())).status,200);assert.equal(user.vocalRemoverEnabled,true);assert.equal(user.stemSeparationEnabled,false);
 env.STEM_TOOLS_ENABLED='false';const disabled=await route.GET(new NextRequest('http://localhost:3013/api/stems'));assert.equal((await disabled.json()).available,false);
 console.log('PASS stem handlers: auth, independent permissions, full-job rejection, revocation, preview, stale session, admin origin, disabled worker, private owner HMAC');
})().catch(error=>{console.error(error);process.exitCode=1});
