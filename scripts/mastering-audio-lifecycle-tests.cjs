/* Execute actual provider effects with deterministic hooks and delayed fetch. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const slots=[],pending=[],effects=[];let cursor=0,created=0,closed=0,failDecode=false;const requests=[],urls=[],revoked=[];
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
const react={createContext:()=>({Provider:'provider'}),useContext:()=>null,useRef:value=>{const i=cursor++;return slots[i]??=( {current:value});},useState:value=>{const i=cursor++;slots[i]??={value};return[slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;}];},useCallback:(fn,deps)=>{const i=cursor++;if(!equal(slots[i]?.deps,deps))slots[i]={value:fn,deps};return slots[i].value;},useEffect:(fn,deps)=>{const i=cursor++;if(!equal(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};effects.push(i);});}};
const audio={src:'',paused:true,duration:0,currentTime:0,addEventListener(){},removeEventListener(){},load(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};
class Context{constructor(){this.state='running';created++;}async decodeAudioData(){if(failDecode)throw Error('fixture decode failed');return{getChannelData:()=>new Float32Array(1600).fill(.25)};}async close(){this.state='closed';closed++;}}
const moduleRef={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('contexts/AudioEngineContext.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:moduleRef,exports:moduleRef.exports,require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props})}:{getOrCreateAudioElement:()=>audio,setGlobalAudioAvailable(){},setGlobalAudioPlaying(){},registerGlobalStop(){},registerGlobalToggle(){}},AbortController,Float32Array,AudioContext:Context,window:{},document:{hidden:false,addEventListener(){},removeEventListener(){}},cancelAnimationFrame(){},requestAnimationFrame:()=>1,setTimeout,clearTimeout,URL:{createObjectURL:blob=>{urls.push(blob);return'blob:fixture-'+urls.length;},revokeObjectURL:url=>revoked.push(url)},fetch:(url,{signal}={})=>new Promise(resolve=>requests.push({url,signal,resolve})),console});
function render(a,b){cursor=0;const view=moduleRef.exports.AudioEngineProvider({originalUrl:a,masteredUrl:b,children:null});for(const fn of pending.splice(0))fn();return view.props.value;}
function respond(request){request.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8),blob:async()=>({source:request.url})});}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const initial=render('/old-a','/old-b');assert.equal(initial.loudnessMatched,false);const old=requests.splice(0);assert.equal(old.length,3);initial.setLoudnessMatched(true);assert.equal(render('/old-a','/old-b').loudnessMatched,true);initial.setLoudnessMatched(false);assert.equal(render('/old-a','/old-b').loudnessMatched,false);
 render('/new-a','/new-b');assert.ok(old.every(r=>r.signal.aborted));const current=requests.splice(0);assert.equal(current.length,3);
 for(const r of old)respond(r);await tick();assert.equal(created,0);assert.equal(urls.length,0);
 for(const r of current)respond(r);await tick();assert.equal(urls.length,1);assert.equal(urls[0].source,'/new-b');assert.equal(created,2);assert.equal(closed,2);
 const view=render('/new-a','/new-b');assert.equal(view.staticWaveform.length,800);assert.equal(view.staticWaveformB.length,800);
 console.log('PASS late old-track responses cannot create blobs or overwrite waveforms; successful decoder contexts close');
 failDecode=true;render('/broken-a','/broken-b');const broken=requests.splice(0);for(const r of broken)respond(r);await tick();assert.equal(created,4);assert.equal(closed,4);
 const failed=render('/broken-a','/broken-b');assert.equal(failed.staticWaveform,null);assert.equal(failed.staticWaveformB,null);
 for(const i of new Set(effects))slots[i]?.cleanup?.();assert.ok(broken.every(r=>r.signal.aborted));assert.equal(revoked.length,2);
 console.log('PASS decoder failures still close contexts; track/unmount cleanup aborts fetches and revokes owned URLs');
 console.log('2 actual audio-provider lifecycle groups passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
