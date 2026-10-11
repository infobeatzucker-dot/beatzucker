const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName:file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX } }).outputText,
    { module, exports: module.exports, require: name => imports[name], Float32Array, Float64Array, Uint8Array, DataView, ArrayBuffer, Blob, Error, Math, Number });
  return module.exports;
}
const worker = load('lib/workerAnalysis.ts'), audio = load('lib/clientAudio.ts');
function buffer(channels, rate = 48000) { return { numberOfChannels: channels.length, length: channels[0].length, duration: channels[0].length / rate, sampleRate: rate, getChannelData: i => channels[i] }; }
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
test('silence is not spectral conflict or a valid phase measurement', () => {
  const silence = buffer([new Float32Array(4800), new Float32Array(4800)]);
  const spectrum = worker.analyzeSpectrum(silence);
  assert.equal(spectrum.valid, false); assert.equal(Math.max(...spectrum.levels), 0);
  assert.equal(worker.inspectStereo(silence).valid, false);
});
test('counterphase retains spectral energy and reports undefined width', () => {
  const left = Float32Array.from({length:48000}, (_, i) => .4 * Math.sin(2*Math.PI*80*i/48000));
  const input = buffer([left, Float32Array.from(left, v => -v)]);
  assert.equal(worker.analyzeSpectrum(input).valid, true);
  const stereo = worker.inspectStereo(input); assert.equal(stereo.valid, true);
  assert.equal(stereo.widthDefined, false); assert.ok(stereo.correlation < -.999);
});
test('target resampling budget is checked before allocation', () => {
  assert.throws(() => audio.checkResampleBudget({numberOfChannels:2,length:32_000_000,sampleRate:8000,duration:4000}, 96000), /budget/);
});
test('integer export rejects overload rather than silently clipping', () => {
  assert.throws(() => audio.encodeWav(buffer([new Float32Array([1.2])]), '24', false), /OVERLOAD/);
});
test('silence detection identifies absence of active audio', () => {
  assert.equal(audio.findActiveRange(buffer([new Float32Array(4800)])).active, false);
});
const client = load('lib/toolClient.ts');
test('even median and tap-tempo reject duplicated or implausible intervals', () => {
  assert.equal(client.median([-16,-10]),-13);
  assert.equal(client.tapTempo([100,100,100]),0);
  assert.equal(client.tapTempo([0,500,1000,1500,1510,2010]),120);
});
const album = load('components/AlbumConsistencyTool.tsx', {'@/lib/toolClient':client});
test('album needs two measured tracks and computes conventional median', () => {
  const a={integrated_lufs:-16,spectral_centroid:1000},b={...a,integrated_lufs:-10};
  assert.equal(album.albumStats([{id:1,analysis:a}]),null);
  assert.equal(album.albumStats([{id:1,analysis:a},{id:2,analysis:b}]).target,-13);
});
const {VocalDynamics}=load('public/audio/vocal-dynamics.js');
test('vocal zero-percent dynamics nulls with the input at all frequencies', () => {
  for(const hz of [80,1000,6500,12000,18000]) {
    const input=Float32Array.from({length:4800},(_,i)=>.4*Math.sin(2*Math.PI*hz*i/48000)), output=new Float32Array(input.length);
    new VocalDynamics(48000,1).process([input],[output],0,0);
    for(let i=0;i<input.length;i++)assert.ok(Math.abs(output[i]-input[i])<1e-7);
  }
});
test('vocal de-esser reduces sibilant energy, compression is real and stereo-linked', () => {
  const input=Float32Array.from({length:48000},(_,i)=>.8*Math.sin(2*Math.PI*9000*i/48000)),output=new Float32Array(input.length),right=new Float32Array(input.length);
  new VocalDynamics(48000,2).process([input,input],[output,right],100,0);
  let before=0,after=0;for(let i=24000;i<input.length;i++){before+=input[i]**2;after+=output[i]**2;assert.equal(output[i],right[i]);}
  assert.ok(after<before*.7);
  const compressed=new Float32Array(input.length);new VocalDynamics(48000,1).process([input],[compressed],0,100);
  assert.ok(Math.max(...compressed.slice(24000,28000))<.4);
});
test('vocal processing has no fixed lookahead or dropped end-of-file impulse', () => {
  const input=new Float32Array(256);input[255]=.5;const output=new Float32Array(256);
  new VocalDynamics(48000,1).process([input],[output],0,0);assert.equal(output[255],.5);
});
test('short low-end events between former FFT samples are detected', () => {
  const samples=new Float32Array(48000*3);for(let i=10000;i<11000;i++)samples[i]=.8*Math.sin(2*Math.PI*80*i/48000);
  assert.equal(worker.analyzeSpectrum(buffer([samples])).valid,true);
});
test('low sample-rate activity has no artificial quarter-second gaps', () => {
  const samples=Float32Array.from({length:16000},(_,i)=>.4*Math.sin(2*Math.PI*80*i/8000));
  const result=worker.analyzeSpectrum(buffer([samples],8000));
  assert.equal(result.valid,true);assert.ok(result.activity.every(v=>v>0));
});
test('timeouts and duration errors are localized in both languages', () => {
  const timeout=Error('operation timed out');timeout.name='TimeoutError';
  assert.match(client.toolError(timeout,'en'),/too long/);
  assert.match(client.toolError(timeout,'de'),/zu lange/);
  assert.match(client.toolError(Error('DURATION'),'en'),/10 minutes/);
});
console.log(`${passed} tool quality checks passed.`);
