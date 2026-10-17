const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(file, globals = {}, imports = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../' + file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, require: name => imports[name], Float32Array, Float64Array, Uint8Array, DataView, ArrayBuffer, Blob, Math, Number, ...globals });
  return module.exports;
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
async function main() {
  let next = 0, frames = new Map(), intersection, resize, hidden = false, reduced = false;
  const listeners = {}, mediaListeners = {};
  const document = { get hidden() { return hidden; }, addEventListener: (n, f) => listeners[n] = f, removeEventListener: n => delete listeners[n] };
  const media = { get matches() { return reduced; }, addEventListener: (n, f) => mediaListeners[n] = f, removeEventListener: n => delete mediaListeners[n] };
  const animation = load('lib/visibleAnimation.ts', { document, window: { matchMedia: () => media },
    requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} disconnect() {} },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() {} },
  });
  function tick(time) { const copy = [...frames.values()]; frames.clear(); copy.forEach(fn => fn(time)); }
  await test('visible animation throttles to 30 fps', () => {
    const draws = [], loop = animation.startVisibleAnimation({}, time => draws.push(time));
    for (let time = 0; time < 1000; time += 10) tick(time);
    assert.ok(draws.length >= 24 && draws.length <= 31); loop.stop(); assert.equal(frames.size, 0);
  });
  await test('hidden and offscreen canvases stop; return invalidates immediately', () => {
    let draws = 0; const loop = animation.startVisibleAnimation({}, () => draws++);
    tick(0); hidden = true; listeners.visibilitychange(); assert.equal(frames.size, 0);
    hidden = false; listeners.visibilitychange(); tick(10); assert.equal(draws, 2);
    intersection([{ isIntersecting: false }]); assert.equal(frames.size, 0);
    intersection([{ isIntersecting: true }]); tick(20); assert.equal(draws, 3); loop.stop();
  });
  await test('static canvas draws only on invalidation; resize and motion preference update', () => {
    let draws = 0, sizes = 0; const loop = animation.startVisibleAnimation({}, () => draws++, { continuous: false, resize: () => sizes++ });
    tick(0); tick(100); assert.equal(draws, 1); resize(); tick(200); assert.equal(sizes, 1); assert.equal(draws, 2);
    mediaListeners.change(); tick(300); assert.equal(draws, 3); loop.stop(); assert.deepEqual(Object.keys(listeners), []);
  });
  await test('reduced motion uses ten frames per second', () => {
    reduced = true; let draws = 0; const loop = animation.startVisibleAnimation({}, () => draws++);
    for (let t = 0; t < 1000; t += 10) tick(t);
    assert.equal(draws, 10); loop.stop(); reduced = false;
  });
  await test('Sonic Core reduced motion draws once and only redraws for changes', () => {
    reduced = true; let draws = 0; const loop = animation.startVisibleAnimation({}, () => draws++, { maxFps: 24, reducedFps: 0 });
    tick(0); tick(1000); assert.equal(draws, 1); assert.equal(frames.size, 0);
    loop.invalidate(); tick(1100); assert.equal(draws, 2); assert.equal(frames.size, 0);
    loop.stop(); reduced = false;
  });
  const client = load('lib/clientAudio.ts'), analysis = load('lib/workerAnalysis.ts');
  let output; const scope = { postMessage: value => output = value };
  load('lib/audioExport.worker.ts', { globalThis: scope }, { './clientAudio': client, './workerAnalysis': analysis });
  const rate = 48000, channels = [new Float32Array(rate), new Float32Array(rate)];
  for (let i = 5000; i < 40000; i++) channels[0][i] = channels[1][i] = .2 * Math.sin(2 * Math.PI * 100 * i / rate);
  function task(task, input = channels) { scope.onmessage({ data: { channels: input, sampleRate: rate, task } }); assert.ok(!output.error, output.error); return output.result; }
  await test('worker exports real 16/24/float WAV without modifying playback channels', async () => {
    const before = channels[0].slice();
    for (const depth of ['16', '24', '32f']) {
      const result = task({ kind: 'wav', depth, dither: false }); assert.ok(result instanceof Blob);
      const bytes = await result.arrayBuffer(); const meta = client.inspectAudioMetadata(bytes);
      assert.equal(meta.channels, 2); assert.equal(meta.frames, rate); assert.equal(meta.sampleRate, rate);
      assert.ok(bytes.byteLength > 44);
    }
    assert.deepEqual(channels[0], before);
  });
  await test('worker range, waveform, spectrum and stereo tasks return actual results', () => {
    const range = task({ kind: 'range', threshold: -50 }); assert.ok(range.start > 0 && range.end < 1 && range.end > range.start);
    const peaks = task({ kind: 'waveform' }); assert.equal(peaks.length, 1024); assert.ok(Math.max(...peaks) > .19);
    const spectrum = task({ kind: 'spectrum' }); assert.equal(spectrum.levels.length, 42); assert.ok(spectrum.levels.every(Number.isFinite));
    const stereo = task({ kind: 'stereo' }); assert.ok(stereo.correlation > .999); assert.equal(stereo.width, 0);
  });
  await test('worker rejects malformed channels and unsupported tasks', () => {
    for (const data of [{ channels: [], sampleRate: rate, task: { kind: 'wav' } }, { channels: [new Float32Array(0)], sampleRate: rate, task: { kind: 'stereo' } }, { channels, sampleRate: Infinity, task: { kind: 'range' } }, { channels, sampleRate: rate, task: { kind: 'bogus' } }]) {
      scope.onmessage({ data }); assert.ok(output.error);
    }
  });
  await test('native-rate stereo analysis does not miss sparse samples or alias treble into bass', () => {
    const count = rate * 8, left = new Float32Array(count), right = new Float32Array(count);
    for (let i = 0; i < count; i++) { const low = .2 * Math.sin(2 * Math.PI * 70 * i / rate), high = .2 * Math.sin(2 * Math.PI * 11950 * i / rate); left[i] = low + high; right[i] = low - high; }
    const buffer = { numberOfChannels: 2, sampleRate: rate, duration: 8, length: count, getChannelData: i => [left, right][i] };
    const result = analysis.inspectStereo(buffer); assert.ok(Math.abs(result.correlation) < .01); assert.ok(result.bands[0].correlation > .9); assert.ok(result.bands[2].correlation < -.9); assert.ok(result.points.length <= 1800);
    left.fill(0); right.fill(0); left[1] = 1; right[1] = -1;
    assert.equal(analysis.inspectStereo(buffer).correlation, -1);
  });
  console.log(`${passed} browser audio tests passed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
