// BS.1770 mono/stereo K-weighting and integrated gating. The final file is
// measured separately by the encoder, after its codec and peak correction.
function biquad(b0: number, b1: number, b2: number, a1: number, a2: number) {
  let z1 = 0, z2 = 0;
  return (sample: number) => {
    const y = b0 * sample + z1;
    z1 = b1 * sample - a1 * y + z2;
    z2 = b2 * sample - a2 * y;
    return y;
  };
}

export function kWeight(rate: number) {
  const shelf = Math.tan(Math.PI * 1681.974450955533 / rate);
  const q = shelf / .7071752369554196;
  const square = shelf * shelf;
  const den = 1 + q + square;
  const gain = 10 ** (3.999843853973347 / 20);
  const middle = gain ** .4996667741545416;
  const stage1 = biquad((gain + middle * q + square) / den, 2 * (square - gain) / den,
    (gain - middle * q + square) / den, 2 * (square - 1) / den, (1 - q + square) / den);
  const pass = Math.tan(Math.PI * 38.13547087602444 / rate);
  const passQ = pass / .5003270373238773;
  const passSquare = pass * pass;
  const passDen = 1 + passQ + passSquare;
  const stage2 = biquad(1, -2, 1, 2 * (passSquare - 1) / passDen, (1 - passQ + passSquare) / passDen);
  return (sample: number) => stage2(stage1(sample));
}

export function integratedLoudness(power: Float64Array, frameLength: number, totalFrames: number) {
  const absoluteThreshold = 10 ** ((-70 + .691) / 10);
  const blocks: number[] = [];
  for (let end = 4; end * frameLength <= totalFrames; end++) {
    const mean = (power[end - 4] + power[end - 3] + power[end - 2] + power[end - 1]) / (4 * frameLength);
    if (mean >= absoluteThreshold) blocks.push(mean);
  }
  if (!blocks.length) return null;
  const relative = .1 * blocks.reduce((sum, value) => sum + value, 0) / blocks.length;
  const gated = blocks.filter(block => block >= relative);
  return -.691 + 10 * Math.log10(gated.reduce((sum, value) => sum + value, 0) / gated.length);
}
