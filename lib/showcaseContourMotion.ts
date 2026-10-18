/** Onset-driven visual motion from the audible output; no synthetic beat clock. */
const BANDS = [35, 160, 320, 640, 1280, 2560, 5120, 10000, 20000];
export function createContourState() {
  return { levels: new Float32Array(8), bass: 0, bassFloor: 0, rms: 0, rmsFloor: 0, pulse: 0, lastHit: -Infinity, time: 0 };
}
export type ContourState = ReturnType<typeof createContourState>;
export function updateContourFrame(frequency: ArrayLike<number>, samples: ArrayLike<number>, state: ContourState, now: number, active: boolean, reducedMotion: boolean, sampleRate = 48000) {
  if (!active || reducedMotion) {
    state.levels.fill(0); state.bass = state.bassFloor = state.rms = state.rmsFloor = state.pulse = 0;
    state.lastHit = -Infinity; state.time = now; return state;
  }
  const dt = state.time ? Math.max(.001, Math.min(.1, (now - state.time) / 1000)) : 1 / 40;
  state.time = now;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] ** 2;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  const binHz = sampleRate / Math.max(2, frequency.length * 2);
  let bass = 0;
  for (let ring = 0; ring < 8; ring++) {
    const start = Math.max(1, Math.floor(BANDS[ring] / binHz));
    const end = Math.min(frequency.length, Math.max(start + 1, Math.ceil(BANDS[ring + 1] / binHz)));
    let energy = 0;
    for (let bin = start; bin < end; bin++) energy += (Math.max(0, Math.min(255, frequency[bin] || 0)) / 255) ** 2;
    const target = rms > .0005 && end > start ? Math.sqrt(energy / (end - start)) : 0;
    if (!ring) bass = target;
    state.levels[ring] += (target - state.levels[ring]) * (1 - Math.exp(-dt / (target > state.levels[ring] ? .018 : .09)));
  }
  const rise = Math.max(0, bass - state.bass) / (state.bassFloor + .08) * 2.4
    + Math.max(0, rms - state.rms) / (state.rmsFloor + .015) * 1.5;
  state.pulse *= Math.exp(-dt / .095);
  if (rms > .002 && rise > .22 && now - state.lastHit >= 170) {
    state.pulse = Math.min(1, .65 + rise * .22); state.lastHit = now;
  }
  const follow = 1 - Math.exp(-dt / .7);
  state.bassFloor += (bass - state.bassFloor) * follow;
  state.rmsFloor += (rms - state.rmsFloor) * follow;
  state.bass = bass; state.rms = rms;
  return state;
}
