/* Streaming counterparts of mastering.py. Stateful stereo-linked detectors,
 * LR4 + allpass compensation, bounded soft-knee compression. No lookahead here:
 * the server remains responsible for final loudness and true-peak limiting. */
const NAMES = ["sub", "low", "mid", "high"], ATTACK = [0, 30, 15, 8], RELEASE = [0, 120, 80, 40], CAPS = [4, 3.5, 3, 2.5];
const THRESHOLDS = NAMES.map(name => `mb_${name}_threshold`), RATIOS = NAMES.map(name => `mb_${name}_ratio`);
class Biquad {
  constructor(rate, frequency, kind = "low") {
    const w = 2 * Math.PI * Math.min(Math.max(1, frequency), rate * .49) / rate;
    const c = Math.cos(w), alpha = Math.sin(w) / Math.SQRT2, a0 = 1 + alpha;
    this.a1 = -2 * c / a0; this.a2 = (1 - alpha) / a0;
    if (kind === "allpass") { this.b0 = this.a2; this.b1 = this.a1; this.b2 = 1; }
    else {
      const sign = kind === "high" ? -1 : 1;
      this.b0 = (1 - sign * c) / (2 * a0); this.b1 = sign * 2 * this.b0; this.b2 = this.b0;
    }
    this.z1 = [0, 0]; this.z2 = [0, 0];
  }
  tick(x, ch) {
    const y = this.b0 * x + this.z1[ch];
    this.z1[ch] = this.b1 * x - this.a1 * y + this.z2[ch]; this.z2[ch] = this.b2 * x - this.a2 * y;
    return y;
  }
}
class Split {
  constructor(rate, frequency) {
    this.low = [new Biquad(rate, frequency), new Biquad(rate, frequency)];
    this.high = [new Biquad(rate, frequency, "high"), new Biquad(rate, frequency, "high")];
    this.value = new Float64Array(4);
  }
  tick(l, r) {
    this.value[0] = this.low[1].tick(this.low[0].tick(l, 0), 0);
    this.value[1] = this.low[1].tick(this.low[0].tick(r, 1), 1);
    this.value[2] = this.high[1].tick(this.high[0].tick(l, 0), 0);
    this.value[3] = this.high[1].tick(this.high[0].tick(r, 1), 1);
    return this.value;
  }
}
export class MasteringDynamics {
  constructor(rate, mode = "bands") {
    this.rate = rate; this.mode = mode; this.envelopes = new Float64Array(6); this.reduction = 0;
    this.bandValues = new Float64Array(8);
    this.attackTimes = new Float64Array(6); this.releaseTimes = new Float64Array(6);
    this.attackCoeffs = new Float64Array(6); this.releaseCoeffs = new Float64Array(6);
    this.deessLow = new Split(rate, 4000); this.deessHigh = new Split(rate, 9000); this.deessPhase = new Biquad(rate, 9000, "allpass");
    this.sub = new Split(rate, 80); this.low = new Split(rate, 500); this.mid = new Split(rate, 5000);
    this.subPhase1 = new Biquad(rate, 500, "allpass"); this.subPhase2 = new Biquad(rate, 5000, "allpass"); this.lowPhase = new Biquad(rate, 5000, "allpass");
    this.bassSide = new Split(rate, 120); this.bassMid = new Biquad(rate, 120, "allpass");
    this.smoothing = Math.exp(-1 / (.025 * rate)); this.params = {}; this.target = {};
  }
  configure(params, immediate = false) {
    this.target = { ...params };
    if (immediate || !Object.keys(this.params).length) this.params = { ...params };
  }
  gain(index, level, threshold, ratio, attack, release, cap, knee = 4) {
    if (ratio <= 1.0001) return 1;
    if (this.attackTimes[index] !== attack) { this.attackTimes[index] = attack; this.attackCoeffs[index] = Math.exp(-1 / (this.rate * attack / 1000)); }
    if (this.releaseTimes[index] !== release) { this.releaseTimes[index] = release; this.releaseCoeffs[index] = Math.exp(-1 / (this.rate * release / 1000)); }
    const coeff = level > this.envelopes[index] ? this.attackCoeffs[index] : this.releaseCoeffs[index];
    const env = coeff * this.envelopes[index] + (1 - coeff) * level; this.envelopes[index] = env;
    const over = 20 * Math.log10(Math.max(env, 1e-10)) - threshold, slope = 1 - 1 / ratio;
    const gr = Math.abs(over) < knee / 2 && knee > 0 ? slope * (over + knee / 2) ** 2 / (2 * knee) : Math.max(0, over) * slope;
    const reduction = Math.min(cap, gr); if (index === 5) this.reduction = reduction;
    return Math.pow(10, -reduction / 20);
  }
  process(inputs, outputs) {
    const p = this.params, frames = outputs[0]?.length || 0;
    const read = (key, fallback) => Number.isFinite(p[key]) ? p[key] : fallback;
    for (let i = 0; i < frames; i++) {
      for (const key in this.target) if (Number.isFinite(this.target[key])) p[key] = (p[key] ?? this.target[key]) * this.smoothing + this.target[key] * (1 - this.smoothing);
      let l = inputs[0]?.[i] || 0, r = inputs[1]?.[i] ?? l;
      const scale = read("release_scale", 1), knee = read("comp_knee_db", 4);
      if (this.mode === "bus") {
        const gain = this.gain(5, Math.max(Math.abs(l), Math.abs(r)), read("bus_comp_threshold", -20.5), read("bus_comp_ratio", 1), 50, 100 * scale, 2, knee);
        outputs[0][i] = l * gain; if (outputs[1]) outputs[1][i] = r * gain; continue;
      }
      const intensity = read("processing_intensity", 65) / 100;
      if (intensity > 0) {
        const a = this.deessLow.tick(l, r), belowL = this.deessPhase.tick(a[0], 0), belowR = this.deessPhase.tick(a[1], 1);
        const b = this.deessHigh.tick(a[2], a[3]);
        const gain = this.gain(0, Math.max(Math.abs(b[0]), Math.abs(b[1])), -18, 1 + 1.5 * intensity, 2, 60, 3, 4);
        l = belowL + b[0] * gain + b[2]; r = belowR + b[1] * gain + b[3];
      }
      const sub = this.sub.tick(l, r), low = this.low.tick(sub[2], sub[3]), mid = this.mid.tick(low[2], low[3]);
      const bands = this.bandValues;
      bands[0] = this.subPhase2.tick(this.subPhase1.tick(sub[0], 0), 0); bands[1] = this.subPhase2.tick(this.subPhase1.tick(sub[1], 1), 1);
      bands[2] = this.lowPhase.tick(low[0], 0); bands[3] = this.lowPhase.tick(low[1], 1);
      bands[4] = mid[0]; bands[5] = mid[1]; bands[6] = mid[2]; bands[7] = mid[3];
      l = r = 0;
      for (let band = 0; band < 4; band++) {
        const ratio = read(RATIOS[band], 1), a = bands[band * 2], b = bands[band * 2 + 1];
        const attack = band === 0 ? read("mb_sub_attack", 80) : Math.max(5, ATTACK[band] * 2 / Math.max(1, ratio));
        const release = band === 0 ? read("mb_sub_release", 200) * scale : Math.max(40, RELEASE[band] * 2 / Math.max(1, ratio)) * scale;
        const gain = this.gain(band + 1, Math.max(Math.abs(a), Math.abs(b)), read(THRESHOLDS[band], -20), ratio, attack, release, CAPS[band], knee);
        l += a * gain; r += b * gain;
      }
      let m = (l + r) / Math.SQRT2, s = (l - r) / Math.SQRT2 * read("stereo_width", 1);
      const amount = read("bass_mono_amount", 0);
      if (amount > .0001) { const split = this.bassSide.tick(s, s); s = split[2] + split[0] * (1 - amount); m = this.bassMid.tick(m, 0); }
      outputs[0][i] = (m + s) / Math.SQRT2; if (outputs[1]) outputs[1][i] = (m - s) / Math.SQRT2;
    }
  }
}
if (typeof registerProcessor === "function") {
  class MasteringProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super(); this.dsp = new MasteringDynamics(sampleRate, options.processorOptions?.mode);
      this.dsp.configure(options.processorOptions?.params || {}, true); this.frames = 0;
      this.port.onmessage = event => { if (event.data?.params) this.dsp.configure(event.data.params); };
    }
    process(inputs, outputs) {
      if (outputs[0]?.length) this.dsp.process(inputs[0] || [], outputs[0]);
      this.frames += outputs[0]?.[0]?.length || 0;
      if (this.frames >= sampleRate / 10) { this.frames = 0; this.port.postMessage({ reduction: this.dsp.reduction }); }
      return true;
    }
  }
  registerProcessor("beatzucker-mastering-dynamics", MasteringProcessor);
}
