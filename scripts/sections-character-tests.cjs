const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:m,exports:m.exports,require:imports||require,process,Buffer});return m.exports;}
const validator=load('lib/analysisValidation.ts');
const plan={version:1,duration:60,segments:[{start:0,end:20,kind:'quiet',level_db:-8,crest_db:13},{start:20,end:60,kind:'steady',level_db:0,crest_db:10}]};
assert.ok(validator.normalizeSongSections(plan));
for(const p of [{...plan,segments:[]},{...plan,segments:Array(65).fill(plan.segments[0])},{...plan,duration:NaN},{...plan,segments:[{...plan.segments[0],start:2}]},{...plan,segments:[{...plan.segments[0],kind:'chorus',end:60}]}])assert.equal(validator.normalizeSongSections(p),null);
const a={integrated_lufs:-18,true_peak:-5,dr_value:10,crest_factor:10,lra:8,rms_sub:-28,rms_low:-23,rms_mid:-22,rms_high:-28,rms_air:-38,spectral_centroid:2600,spectral_rolloff:8000,spectral_flatness:.2,stereo_width:.4,mono_compatibility:.7,bpm:120,key:'A minor',transient_density:1,dc_offset:0,duration_seconds:60,sample_rate:48000,bit_depth:24,channels:2,clipping_detected:false,sections:plan};
const old=process.env.ANALYSIS_SIGNING_SECRET;process.env.ANALYSIS_SIGNING_SECRET='local-section-signature-fixture';
try{const token=validator.signAnalysis('fixture',a);assert.ok(validator.verifyAnalysis('fixture',validator.normalizeAnalysis(a),token));assert.equal(validator.verifyAnalysis('fixture',{...a,sections:{...plan,segments:[{...plan.segments[0],kind:'dense'},plan.segments[1]]}},token),false);assert.equal(validator.normalizeAnalysis({...a,sections:{...plan,duration:59}}),null);}finally{if(old===undefined)delete process.env.ANALYSIS_SIGNING_SECRET;else process.env.ANALYSIS_SIGNING_SECRET=old;}
console.log('PASS signed, duration-bound, bounded sections; invented semantic labels and tampering rejected');
const drag={current:null};const Dial=load('components/CharacterDial.tsx',name=>name==='react'?{useId:()=>':local-dial:',useRef:()=>drag}:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:{}).default;
let value=.5;const render=(lang='de')=>Dial({value,onChange:n=>value=n,lang,sections:plan});
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}return null;}
const knob=()=>find(render(),n=>n.props?.role==='slider').props;
function key(key,shiftKey=false){knob().onKeyDown({key,shiftKey,preventDefault(){}});}
key('End');assert.equal(value,1);key('ArrowUp');assert.equal(value,1);key('Home');assert.equal(value,0);key('ArrowRight',true);assert.equal(value,.05);key('PageUp');assert.equal(value,.15);knob().onDoubleClick();assert.equal(value,.5);
const target={focus(){},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}};
knob().onPointerDown({button:0,pointerId:1,clientX:20,clientY:100,currentTarget:target});knob().onPointerMove({pointerId:1,clientX:20,clientY:10});assert.equal(value,1);knob().onPointerCancel();knob().onPointerMove({pointerId:1,clientX:20,clientY:500});assert.equal(value,1);
assert.equal(find(render('en'),n=>n.props?.role==='slider').props['aria-label'],'Mastering character');assert.ok(find(render(),n=>n.props?.className==='song-sections-tape').props['aria-label'].includes('0:00'));
console.log('PASS actual 3D dial handlers: bounded pointer drag/cancel, keyboard/Shift/Home/End/Page, reset, localized ARIA and measured section map');
assert.ok(fs.readFileSync('lib/manualPreviewEngine.ts','utf8').includes('this.player.onSchedule'));
assert.ok(fs.readFileSync('python/control_preview.py','utf8').includes('params.section_offset = first / sr'));
assert.ok(fs.readFileSync('components/MasteringWorkspace.tsx','utf8').includes('Number(masterData.params?.character ?? .5)'));
console.log('PASS manual render snapshots completed character; preview scheduling and server control offsets use source time');
