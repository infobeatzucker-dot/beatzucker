const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, imports = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: name => imports[name], Math, Number, Float32Array, ...globals });
  return module.exports;
}
const loop = load('lib/manualLoop.ts');
async function main() {
  for (const duration of [.25, .75, 1, 6, 12, 180])
    for (const start of [-10, 0, duration * .35, duration, 1000, NaN])
      for (const length of [-1, .1, 5, 8, 20, Infinity, NaN]) {
        const region = loop.normalizeLoopRegion(duration, start, length);
        assert.ok(region.start >= 0 && region.len > 0 && region.start + region.len <= duration + 1e-9);
      }
  assert.equal(loop.normalizeLoopRegion(6, 2.1, 8).start, 0);
  assert.equal(loop.normalizeLoopRegion(6, 2.1, 8).len, 6);
  console.log('PASS short/default/drag loop bounds never exceed track duration');
  function param() { return { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {} }; }
  function node() { return { gain:param(), frequency:param(), Q:param(), knee:param(), attack:param(), release:param(), threshold:param(), ratio:param(), connect(next){return next;} }; }
  class AudioContext {
    constructor(){this.currentTime=0;this.state='running';this.destination=node();}
    createMediaElementSource(){return node();} createGain(){return node();} createBiquadFilter(){return node();}
    createDynamicsCompressor(){return node();} createChannelSplitter(){return node();} createChannelMerger(){return node();}
    createWaveShaper(){return node();} createAnalyser(){return node();} async close(){} async resume(){}
  }
  let audio;
  class Audio {
    constructor(){audio=this;this.duration=6;this.currentTime=0;this.paused=true;this.events={};this.playCount=0;}
    addEventListener(name,fn){this.events[name]=fn;} removeEventListener(name){delete this.events[name];}
    async play(){this.playCount++;this.paused=false;this.events.play?.();}
    pause(){this.paused=true;this.events.pause?.();} removeAttribute(){} load(){}
  }
  const {ManualPreviewEngine} = load('lib/manualPreviewEngine.ts', {'./manualLoop':loop}, {AudioContext, Audio, requestAnimationFrame:()=>1,cancelAnimationFrame(){} });
  const engine = new ManualPreviewEngine('fixture', {});
  await engine.toggle(2,8);
  assert.equal(audio.currentTime,0); assert.equal(audio.paused,false);
  audio.currentTime=6;audio.paused=true;audio.events.ended(); await Promise.resolve();
  assert.equal(audio.currentTime,0);assert.equal(audio.paused,false);assert.equal(audio.playCount,2);
  console.log('PASS full-file EOF loops without depending on animation frames');
  engine.pause();const plays=audio.playCount;audio.events.ended();await Promise.resolve();assert.equal(audio.playCount,plays);
  console.log('PASS explicit pause does not restart playback');
  audio.duration=2;audio.events.loadedmetadata();assert.ok(engine.loopStart+engine.loopEnd-engine.loopStart<=2);
  engine.destroy();assert.equal(Object.keys(audio.events).length,0);
  console.log('PASS metadata bounds and audio listeners are cleaned up');
  const modal = fs.readFileSync('components/ManualAdjustModal.tsx','utf8');
  assert.ok(modal.includes('normalizeLoopRegion(dur, dur * .35, 8)'));
  assert.ok(modal.includes('if (chipTimeRef.current) chipTimeRef.current.textContent'));
  assert.ok(!modal.includes('if (dragRef.current && chipTimeRef.current)'));
  console.log('PASS waveform chip refreshes canonical region outside dragging');
  console.log('5 manual loop regression checks passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
