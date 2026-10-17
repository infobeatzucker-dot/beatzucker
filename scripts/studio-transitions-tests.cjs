const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:name=>name==='react'?{useId:()=>':fixture:'}:{jsx,jsxs:jsx}});return mod.exports.default;}
function all(node){return node&&typeof node==='object'?[node,...[node.props?.children].flat(Infinity).flatMap(all)]:[];}
const Switch=load('components/ABModeSwitch.tsx');
for(const lang of ['de','en']){
 const calls=[],view=Switch({mode:'A',onChange:m=>calls.push(m),available:false,lang});
 const buttons=all(view).filter(n=>n.type==='button');assert.equal(buttons.length,2);assert.equal(buttons[0].props['aria-pressed'],true);assert.equal(buttons[1].props.disabled,true);
 assert.equal(view.props.style.display,'flex');assert.equal(view.props.style.width,'100%');
 for(const button of buttons){assert.ok(button.props.style.minHeight>=44);assert.equal(button.props.style.display,'flex');assert.ok(button.props.style.background);assert.ok(button.props.style.color);}
 const ready=Switch({mode:'B',onChange:m=>calls.push(m),available:true,lang});const active=all(ready).filter(n=>n.type==='button');
 assert.equal(active[1].props.disabled,false);assert.equal(active[1].props['aria-pressed'],true);
 active[0].props.onClick();assert.equal(calls.join(','),'A','selection calls engine synchronously exactly once');
 active[1].props.onClick();assert.equal(calls.join(','),'A,B');
}
console.log('PASS actual bilingual A/B switch: selected state, unavailable-master guard, synchronous single callback');
const Signal=load('components/UploadSignal.tsx');
for(const [input,expected] of [[-4,100],[58,42],[145,0],[NaN,100]]){
 const circles=all(Signal({phase:'uploading',progress:input})).filter(n=>n.props?.className==='studio-upload-ring');assert.equal(circles[0].props.strokeDashoffset,expected);
}
assert.equal(all(Signal({phase:'idle'})).some(n=>n.props?.className==='studio-upload-check'),false);
assert.equal(all(Signal({phase:'received'})).some(n=>n.props?.className==='studio-upload-check'),true);
console.log('PASS upload decoration clamps actual byte progress and only shows receipt in received state');
const Ready=load('components/MasterReadyReveal.tsx');for(const lang of ['de','en']){
 const child={type:'fixture-player',props:{}};const view=Ready({lang,children:child});assert.ok(all(view).includes(child));assert.ok(all(view).some(n=>n.props?.role==='status'));
 const text=JSON.stringify(view);assert.match(text,lang==='de'?/Dein Master ist bereit/:/Your master is ready/);
}
console.log('PASS completion wrapper exposes result children immediately, with localized status');
let reduced=false;const jumps=[],jumpModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/DownloadJumpButton.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:jumpModule,exports:jumpModule.exports,require:()=>({jsx,jsxs:jsx}),window:{matchMedia:()=>({matches:reduced})}});
const target={current:{focus:options=>jumps.push(['focus',options]),scrollIntoView:options=>jumps.push(['scroll',options])}};
for(const lang of ['de','en']){
 const view=jumpModule.exports.default({target,targetId:'formats-fixture',lang});assert.equal(view.props['aria-controls'],'formats-fixture');assert.match(JSON.stringify(view),lang==='de'?/Zum Download/:/Go to downloads/);
 view.props.onClick();assert.equal(jumps.at(-2)[0],'focus');assert.equal(jumps.at(-2)[1].preventScroll,true);assert.equal(jumps.at(-1)[1].behavior,'smooth');
}
reduced=true;jumpModule.exports.default({target,targetId:'formats-fixture',lang:'de'}).props.onClick();assert.equal(jumps.at(-1)[1].behavior,'instant');
jumpModule.exports.default({target:{current:null},targetId:'formats-fixture',lang:'de'}).props.onClick();
console.log('PASS localized download jump, keyboard focus, reduced-motion scrolling and missing-target safety');
const workspace=fs.readFileSync('components/MasteringWorkspace.tsx','utf8'),player=fs.readFileSync('components/ABPlayer.tsx','utf8'),upload=fs.readFileSync('components/UploadZone.tsx','utf8');
assert.match(workspace,/setTimeout\(\(\) => engine\.playMaster\(\), 700\)/,'existing autoplay retained');
assert.match(player,/<ABModeSwitch mode=\{mode\} onChange=\{engine\.setMode\}/);assert.match(player,/data-wave-ready=\{!!engine\.staticWaveform\}/);
assert.doesNotMatch(player,/Animated glow sweep|repeatDelay: 1.5/);
assert.match(upload,/phase=\{isUploading \? "uploading" : "received"\}/);assert.match(upload,/xhr\.upload\.onprogress/);
assert.match(upload,/e\.target === e\.currentTarget/);
for(const file of ['UploadSignal','MasterReadyReveal','ABModeSwitch'])assert.doesNotMatch(fs.readFileSync(`components/${file}.tsx`,'utf8'),/setTimeout|setInterval|requestAnimationFrame|AudioContext|fetch\(|\.play\(/);
const css=fs.readFileSync('app/studio-transitions.css','utf8');assert.match(css,/prefers-reduced-motion:reduce/);assert.doesNotMatch(css,/infinite/);
console.log('PASS autoplay and real waveform preserved; decorations have no network, audio or timers; no CSS animation loops');
