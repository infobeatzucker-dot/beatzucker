/** Canonical loop bounds shared by the waveform and the audio player. */
export function normalizeLoopRegion(duration: number, start: number, length: number) {
  const dur = Number.isFinite(duration) && duration > 0 ? duration : .001;
  const requested = Number.isFinite(length) ? length : Math.min(8, dur);
  const len = Math.max(Math.min(1, dur), Math.min(20, dur, requested));
  return { start: Math.max(0, Math.min(dur - len, Number.isFinite(start) ? start : 0)), len };
}
