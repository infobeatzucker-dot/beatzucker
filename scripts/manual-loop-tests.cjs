const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={},globals={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>imports[name],Math,Number,Float32Array,Map,URL,AbortController,AbortSignal,DOMException,...globals});return module.exports;}
const loop=load('lib/manualLoop.ts');
(async()=>{
 for(const duration of [.25,.75,1,6,12,180])for(const start of [-10,0,duration*.35,duration,1000,NaN])for(const length of [-1,.1,5,8,20,Infinity,NaN]){const r=loop.normalizeLoopRegion(duration,start,length);assert.ok(r.start>=0&&r.len>0&&r.start+r.len<=duration+1e-9);}
 console.log('PASS bounded short/full/drag regions');
 let requests=0,starts=0,stops=0,resumes=0,release=null;
 const context={currentTime:0,resume:async()=>{resumes++;},suspend:async()=>{},createBufferSource(){return {connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};},async decodeAudioData(){return {numberOfChannels:2,duration:6,length:288000,sampleRate:48000,getChannelData:()=>new Float32Array(288000)};}};
 const {PreviewLoopPlayer}=load('lib/previewLoopPlayer.ts',{'./manualLoop':loop},{fetch:async(_,options)=>{requests++;assert.equal(JSON.parse(options.body).file_id,'fixture');if(release)await new Promise(resolve=>{release=resolve;});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 const player=new PreviewLoopPlayer(context,{},'/api/preview?file_id=fixture&upload_token=token',60);
 player.setRegion(3,9);await player.prepare();assert.equal(starts,0);assert.equal(requests,1);
 const play=player.toggle(3,9);assert.equal(resumes,1);await play;assert.equal(starts,1);assert.equal(player.paused,false);
 context.currentTime=600;assert.equal(player.currentTime,3);assert.equal(requests,1);
 console.log('PASS decoded native loops do not refetch or depend on animation frames');
 player.pause();assert.equal(stops,1);await player.toggle(3,9);assert.equal(requests,1);assert.equal(starts,2);
 console.log('PASS pause and cached restart');
 player.pause();release=true;const waiting=player.toggle(10,16);await new Promise(resolve=>setImmediate(resolve));player.pause();release();release=null;await waiting;assert.equal(starts,2);
 console.log('PASS late decode cannot start after pause');
 release=true;const stale=player.toggle(20,26);await new Promise(resolve=>setImmediate(resolve));const oldRelease=release;release=null;player.setRegion(30,36);oldRelease();await stale;await new Promise(resolve=>setImmediate(resolve));assert.equal(starts,3);assert.equal(player.currentTime,30);
 player.destroy();assert.equal(player.paused,true);
 console.log('PASS new selection wins over an older pending selection; destroy stops audio');
 const engine=fs.readFileSync('lib/manualPreviewEngine.ts','utf8'),modal=fs.readFileSync('components/ManualAdjustModal.tsx','utf8');
 assert.ok(!engine.includes('new Audio('));assert.ok(!engine.includes('requestAnimationFrame'));assert.ok(engine.indexOf('const resumed = this.ctx.resume()')<engine.indexOf('await Promise.all'));
 const drag=modal.slice(modal.indexOf('const setRegionLive'),modal.indexOf('const commitRegion'));assert.ok(!drag.includes('engineRef.current?.setRegion'));assert.ok(modal.includes('ensureEngine().prepare()'));
 console.log('PASS user activation precedes waits; dragging commits once; modal preloads');
 console.log('6 manual loop regression checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
