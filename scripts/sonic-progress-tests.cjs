const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,requireMock=()=>({}),extra={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:requireMock,...extra});return mod.exports;}
const {sonicStage,drawSonicCore}=load('lib/sonicCore.ts');
assert.equal(sonicStage('loading'),'analyzing');assert.equal(sonicStage(),'analyzing');
const stages=['waiting','analyzing','eq','compression','ms','saturation','limiting','rendering','complete'];
const profiles=new Map();
for(const [w,h] of [[280,150],[560,234],[920,300],[0,0]])for(const stage of stages)for(const finish of [0,1]){
 let points=[];const ctx={clearRect(){},fillRect(){},beginPath(){},stroke(){},fill(){},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),moveTo:record,lineTo:record,arc:record};
 function record(...args){assert.ok(args.every(Number.isFinite),'finite drawing coordinates');points.push(args);}
 drawSonicCore(ctx,w,h,4200,stage,finish);assert.ok(points.length<2200,'bounded geometry');
 if(w===560&&finish===0)profiles.set(stage,JSON.stringify(points));
}
for(const stage of ['waiting','eq','compression','ms','limiting'])assert.notEqual(profiles.get(stage),profiles.get('analyzing'),stage+' distinct geometry');
console.log('PASS all stages, completion and narrow/large canvases have finite bounded geometry');
let refs=[],cursor=0,effects=[],callback,options,stops=0,invalidations=0;const commands=[];
const element={width:0,height:0,getBoundingClientRect:()=>({width:560,height:234}),getContext:()=>({setTransform(...args){commands.push(args);}})};
const react={useRef:value=>refs[cursor++]??={current:value},useEffect:fn=>effects.push(fn)};
const core=load('components/MasteringSonicCore.tsx',name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props})}:name.includes('sonicCore')?{sonicStage,drawSonicCore:(...args)=>commands.push(args.slice(1))}:{startVisibleAnimation:(el,cb,opts)=>{callback=cb;options=opts;return{invalidate(){invalidations++;},stop(){stops++;}};}},{window:{devicePixelRatio:3,matchMedia:()=>({matches:false})}}).default;
const completed={current:false};core({step:'eq',completed});refs[0].current=element;const cleanups=effects.map(fn=>fn());assert.equal(options.maxFps,24);assert.equal(options.reducedFps,0);assert.equal(element.width,840);callback(100);callback(150);assert.equal(commands.at(-1)[3],'eq');completed.current=true;callback(200);assert.equal(commands.at(-1)[3],'complete');assert.ok(commands.at(-1)[4]>0);cleanups.forEach(fn=>fn?.());assert.equal(stops,1);
console.log('PASS canvas frame cap, DPR cap, success morph and cleanup');
const modal=fs.readFileSync('components/MasteringProgressModal.tsx','utf8');assert.match(modal,/kein Live-Analyzer/);assert.match(modal,/not a live analyzer/);assert.match(modal,/aria-valuenow=\{progress\}/);assert.match(modal,/Math\.min\(100, Math\.max\(0/);assert.match(modal,/previous\.focus/);
for(const file of ['components/MasteringSonicCore.tsx','lib/sonicCore.ts'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/AudioContext|fetch\(|setInterval|WebGL/);
const releases=load('lib/releases.ts').RELEASES;assert.equal(releases[0].version,require('../package.json').version);assert.ok(releases[0].improvements.de.length&&releases[0].improvements.en.length);
console.log('PASS honest bilingual UI, real clamped progress, focus restoration and matching release');
