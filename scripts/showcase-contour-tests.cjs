const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/showcaseContourMotion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports});
const {createContourState,updateContourFrame:update}=mod.exports,bins=new Uint8Array(1024),samples=new Float32Array(2048),state=createContourState();
update(bins,samples,state,1000,true,false);assert.equal(state.pulse,0);assert.ok(state.levels.every(x=>x===0));
const hits=[];for(let frame=0;frame<200;frame++){const hit=frame%20<2;bins.fill(0);bins.fill(hit?230:45,1,7);for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i*.03)*(hit?.2:.025);const before=state.lastHit;update(bins,samples,state,2000+frame*25,true,false);if(state.lastHit!==before)hits.push(frame);assert.ok(state.pulse>=0&&state.pulse<=1);}
assert.equal(hits.length,10,'Each 120-BPM fixture impulse must produce one visible pulse');assert.ok(hits.every((frame,i)=>frame===i*20),'No free-running beat clock or double hits');
bins.fill(100);samples.fill(.08);for(let f=0;f<100;f++)update(bins,samples,state,8000+f*25,true,false);assert.ok(state.pulse<.0001,'Steady energy must not keep beating');
update(bins,samples,state,12000,false,false);assert.equal(state.pulse,0);assert.ok(state.levels.every(x=>x===0));
update(bins,samples,state,12100,true,true);assert.equal(state.pulse,0);assert.ok(state.levels.every(x=>x===0));
update(new Uint8Array(0),new Float32Array(0),state,13000,true,false);assert.ok(state.levels.every(Number.isFinite));
const view=fs.readFileSync('components/MasteringListeningShowcase.tsx','utf8'),css=fs.readFileSync('components/showcase-gallery.css','utf8');assert.ok(view.includes('startVisibleAnimation(deck.current ?? element'));assert.ok(view.includes('getFloatTimeDomainData(samples)'));assert.ok(view.includes('playing && !!analyser, reducedMotion.matches'));assert.ok(view.includes('resetContours();'));assert.ok(css.includes('var(--pulse,0)*.42'));assert.ok(css.includes('prefers-reduced-motion'));assert.ok(!css.includes('gallery-orbit'));
console.log('PASS ten timed impulses produce ten pulses, steady tones do not free-run, immediate pause/reduced-motion reset, bounded state and real output wiring');
