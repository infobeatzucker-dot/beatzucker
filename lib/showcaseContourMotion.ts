/** Eight coarse visual bands from the existing audible-output FFT, not a BPM detector. */
const EDGES = [1, 2, 3, 5, 9, 17, 33, 65, 128];

export function updateContourEnergies(frequency: ArrayLike<number>, levels: Float32Array, active: boolean, reducedMotion: boolean) {
  for (let ring = 0; ring < levels.length; ring++) {
    if (!active || reducedMotion) { levels[ring] = 0; continue; }
    const start = EDGES[ring] ?? frequency.length;
    const end = Math.min(frequency.length, EDGES[ring + 1] ?? frequency.length);
    let energy = 0;
    for (let bin = start; bin < end; bin++) energy += (Math.max(0, Math.min(255, frequency[bin] || 0)) / 255) ** 2;
    const target = end > start ? Math.sqrt(energy / (end - start)) : 0;
    // Faster attack and slower release keep transients visible without hard flashing.
    levels[ring] += (target - levels[ring]) * (target > levels[ring] ? .65 : .18);
  }
  return levels;
}
