const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,extra={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require,Response,Buffer,URL,URLSearchParams,TextDecoder,Uint8Array,process:{env:{NEXTAUTH_URL:'https://beatzucker.de'}},setTimeout,clearTimeout,...extra});return module.exports;}
const route=load('app/api/report/route.ts');
const request=(value,headers={})=>new Request('https://beatzucker.de/api/report',{method:'POST',headers:{Origin:'https://beatzucker.de',...headers},body:value});
const post=(payload,headers={})=>route.POST(request(new URLSearchParams({data:JSON.stringify(payload)}),headers));
(async()=>{
 for(const lang of ['de','en']){
  const payload={filename:'Änderung <script>alert(1)</script>.wav',lang,pre:{integrated_lufs:-20,channels:2},post:{integrated_lufs:-9,true_peak:-1},notes:'Großer Bericht ü & '.repeat(3000),params:{target_lufs:-9,presence_gain:1.5},manualOverrides:{presence_gain:1.5},availableFormats:['wav24','mp3320']};
  const response=await post(payload);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/html/);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);const html=await response.text();assert.ok(html.includes(lang==='de'?'Mastering-Bericht':'Mastering report'));assert.ok(html.includes('Änderung &lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes(lang==='de'?'MANUELL':'MANUAL'));assert.ok(html.includes('MP3 320 kbps'));assert.ok(html.includes('Großer Bericht ü &amp;'));
 }
 for(const invalid of [null,[],42,'bad'])assert.equal((await post(invalid)).status,400);
 assert.equal((await route.POST(request('data=%7Bbad'))).status,415);
 assert.equal((await route.POST(request('data=%7Bbad',{'content-type':'application/x-www-form-urlencoded'}))).status,400);
 assert.equal((await post({}, {Origin:'https://other.invalid'})).status,403);
 assert.equal((await post({notes:'a'.repeat(530000)})).status,413);
 const streamed=new Request('https://beatzucker.de/api/report',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new ReadableStream({start(c){c.enqueue(new Uint8Array(530000));c.close();}}),duplex:'half'});assert.equal((await route.POST(streamed)).status,413);
 const legacy=await route.GET({nextUrl:new URL('https://beatzucker.de/api/report?data='+encodeURIComponent(Buffer.from(JSON.stringify({filename:'Legacy.wav',pre:{}})).toString('base64')))});assert.equal(legacy.status,200);assert.equal((await route.GET({nextUrl:new URL('https://beatzucker.de/api/report?data=bnVsbA==')})).status,400);
 let attached=false,removed=false,submitted=false,form;
 const document={createElement(tag){const el={tag,setAttribute(k,v){this[k]=v},appendChild(child){this.child=child},submit(){assert.ok(attached);submitted=true},remove(){removed=true}};if(tag==='form')form=el;return el},body:{appendChild(){attached=true}}};
 let cleanup;load('lib/openMasteringReport.ts',{document,setTimeout:callback=>{cleanup=callback;}}).openMasteringReport({filename:'Über Nacht.wav',notes:'long'.repeat(5000)});assert.ok(submitted&&!removed);cleanup();assert.ok(removed);assert.equal(form.method,'POST');assert.equal(form.action,'/api/report');assert.equal(form.target,'_blank');assert.equal(form.rel,'noopener');assert.equal(JSON.parse(form.child.value).filename,'Über Nacht.wav');assert.ok(!fs.readFileSync('components/DownloadPanel.tsx','utf8').includes('/api/report?data='));
 console.log('PASS large bilingual reports via short POST navigation, Unicode, HTML escaping, manual settings, legacy GET, malformed/oversized bodies, foreign origin, native new-tab form and cleanup');
})().catch(error=>{console.error(error);process.exitCode=1});
