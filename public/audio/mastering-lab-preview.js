const gain = db => Math.pow(10, db / 20);
const coefficient = milliseconds => Math.exp(-1000 / (sampleRate * milliseconds));

class BassDucker {
  low = new Float64Array(2);
  floor = 0;
  detector = 0;
  fast = 0;
  slow = 0;
  gain = 1;
  wait = 0;
  hold = 0;
  armed = true;
  triggers = 0;
  attack = coefficient(3);
  fastRate = 1 - coefficient(8);
  slowRate = 1 - coefficient(90);
  floorRate = 1 - Math.exp(-2 * Math.PI * 28 / sampleRate);
  detectorRate = 1 - Math.exp(-2 * Math.PI * 150 / sampleRate);
  cooldownFrames = Math.round(sampleRate * .11);
  holdFrames = Math.round(sampleRate * .022);

  configure(data, lowPassRate) {
    this.depthGain = gain(-Math.min(8, Math.max(0, data.duckDepth ?? 0)));
    this.threshold = gain(Math.max(-60, Math.min(0, data.duckThreshold ?? -31))) ** 2;
    this.cutoff = lowPassRate(Math.max(45, Math.min(150, data.duckFrequency ?? 85)));
    this.detectorRate = lowPassRate(Math.max(50, Math.min(250, data.duckDetectorFrequency ?? 150)));
    this.release = coefficient(Math.max(50, Math.min(380, data.duckRelease ?? 145)) / 3);
    if (this.depthGain === 1) this.hold = 0;
  }

  track(l, r) {
    // Slow energy models sustained bass. A sharp rise above it suggests a kick.
    const mono = (l + r) * .5;
    this.floor += this.floorRate * (mono - this.floor);
    this.detector += this.detectorRate * (mono - this.floor - this.detector);
    const energy = this.detector * this.detector;
    this.fast += this.fastRate * (energy - this.fast);
    this.slow += this.slowRate * (energy - this.slow);
    this.low[0] += this.cutoff * (l - this.low[0]);
    this.low[1] += this.cutoff * (r - this.low[1]);
    if (this.wait > 0) this.wait--;
    if (this.fast < this.slow * 1.5) this.armed = true;
    if (this.depthGain < 1 && this.armed && this.wait === 0 && this.fast > Math.max(this.threshold, this.slow * 2.1)) {
      this.armed = false;
      this.triggers++;
      this.wait = this.cooldownFrames;
      this.hold = this.holdFrames;
    }
    const target = this.hold > 0 ? this.depthGain : 1;
    const smoothing = this.hold > 0 ? this.attack : this.release;
    if (this.hold > 0) this.hold--;
    this.gain = target + smoothing * (this.gain - target);
    if (target === 1 && this.gain > .999999) this.gain = 1;
  }
}

class MasteringLabPreview extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.filters = [new Float64Array(3), new Float64Array(3)];
    this.crossovers = [80, 500, 5000].map(hz => 1 - Math.exp(-2 * Math.PI * hz / sampleRate));
    this.bands = [new Float64Array(4), new Float64Array(4)];
    this.detectors = new Float64Array(4);
    this.reductions = new Float64Array(4).fill(1);
    this.attack = coefficient(14);
    this.recovery = coefficient(150);
    this.smooth = coefficient(8);
    this.drive = 1;
    this.ceiling = 1;
    this.limitGain = 1;
    this.stereo = new Float64Array([1, 0, 0]);
    this.colorTargets = new Float64Array([1, 0, 0]);
    this.bassSide = 0;
    this.bassSpeed = 1 - Math.exp(-2 * Math.PI * 120 / sampleRate);
    this.busLevel = 0;
    this.busGain = 1;
    this.busThreshold = .1;
    this.busSlope = 0;
    this.energy = new Float64Array(3);
    this.deessLow = new Float64Array(2);
    this.finalLow = new Float64Array(2);
    this.deessGain = 1;
    this.deessLevel = 0;
    this.deessAmount = 0;
    this.air = 0;
    this.deessAttack = coefficient(3);
    this.deessRelease = coefficient(63);
    this.deessCoefficient = .4;
    this.airCoefficient = .6;
    this.ducker = new BassDucker();
    this.ducker.configure({}, this.lowPassRate);
    this.meters = options?.processorOptions?.meters !== false;
    this.frame = 0;
    this.port.onmessage = ({ data }) => this.configure(data);
    const initial = options?.processorOptions?.settings;
    if (initial) {
      this.configure(initial);
      this.drive = this.targetDrive;
      this.ceiling = this.targetCeiling;
      this.stereo.set(this.colorTargets);
      this.deessAmount = this.targetDeess;
      this.air = this.targetAir;
    }
  }

  configure(data) {
      this.compression = data.dynamics;
      this.limiting = data.limiter;
      this.thresholds = data.bands.map(band => gain(band.threshold));
      this.ratios = data.bands.map(band => 1 / band.ratio - 1);
      this.targetDrive = this.limiting ? gain(data.drive) : 1;
      this.targetCeiling = this.limiting ? gain(data.ceiling) : 1;
      this.release = coefficient(data.release);
      this.colorTargets.set([data.width ?? 1, data.monoBass ?? 0, data.saturation ?? 0]);
      this.busThreshold = gain(data.busThreshold ?? -20);
      this.busSlope = 1 / (data.busRatio ?? 1) - 1;
      this.targetDeess = data.deessAmount ?? 0;
      this.deessThreshold = gain(data.deessThreshold ?? -24);
      this.deessCoefficient = this.lowPassRate(data.deessFrequency ?? 6800);
      this.targetAir = gain(data.finalAir ?? 0) - 1;
      this.airCoefficient = this.lowPassRate(data.finalFrequency ?? 12000);
      this.ducker.configure(data, this.lowPassRate);
  }

  lowPassRate(hz) {
    return 1 - Math.exp(-2 * Math.PI * Math.min(hz, sampleRate * .48) / sampleRate);
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input.length || !output.length) return true;
    const left = input[0];
    const right = input[1] ?? left;
    const ducker = this.ducker;
    for (let i = 0; i < left.length; i++) {
      let l = left[i], r = right[i];
      if (ducker.depthGain < 1 || ducker.gain !== 1) {
        ducker.track(l, r);
        l += (ducker.gain - 1) * ducker.low[0];
        r += (ducker.gain - 1) * ducker.low[1];
      }
      this.deessLow[0] += this.deessCoefficient * (l - this.deessLow[0]);
      this.deessLow[1] += this.deessCoefficient * (r - this.deessLow[1]);
      const highL = l - this.deessLow[0], highR = r - this.deessLow[1];
      const highPeak = Math.max(Math.abs(highL), Math.abs(highR));
      const deessSpeed = highPeak > this.deessLevel ? this.deessAttack : this.deessRelease;
      this.deessLevel = highPeak + deessSpeed * (this.deessLevel - highPeak);
      const deessAmount = this.targetDeess ?? 0;
      this.deessAmount = deessAmount + this.smooth * (this.deessAmount - deessAmount);
      const deessTarget = this.deessAmount > 0 && this.deessLevel > this.deessThreshold
        ? Math.pow(Math.max(this.deessThreshold / this.deessLevel, .25), this.deessAmount) : 1;
      this.deessGain = deessTarget + this.smooth * (this.deessGain - deessTarget);
      l += (this.deessGain - 1) * highL;
      r += (this.deessGain - 1) * highR;
      for (let channel = 0; channel < 2; channel++) {
        const dry = channel === 0 ? l : r;
        const state = this.filters[channel];
        const parts = this.bands[channel];
        for (let band = 0; band < 3; band++) {
          state[band] += this.crossovers[band] * (dry - state[band]);
        }
        parts[0] = state[0];
        parts[1] = state[1] - state[0];
        parts[2] = state[2] - state[1];
        parts[3] = dry - state[2];
      }
      let processedL = l;
      let processedR = r;
      for (let band = 0; band < 4; band++) {
        const a = this.bands[0][band], b = this.bands[1][band];
        const peak = Math.max(Math.abs(a), Math.abs(b));
        const level = this.detectors[band];
        const slope = peak > level ? this.attack : this.recovery;
        const next = peak + slope * (level - peak);
        this.detectors[band] = next;
        const target = this.compression && next > this.thresholds[band]
          ? Math.pow(next / this.thresholds[band], this.ratios[band]) : 1;
        const ratio = target + this.smooth * (this.reductions[band] - target);
        this.reductions[band] = ratio;
        processedL += (ratio - 1) * a;
        processedR += (ratio - 1) * b;
      }
      for (let control = 0; control < this.stereo.length; control++) {
        const target = this.colorTargets[control];
        this.stereo[control] = target + this.smooth * (this.stereo[control] - target);
      }
      const width = this.stereo[0], monoBass = this.stereo[1], saturation = this.stereo[2];
      const side = (processedL - processedR) * .5;
      this.bassSide += this.bassSpeed * (side - this.bassSide);
      const sideChange = (width - 1) * side - width * monoBass * this.bassSide;
      processedL += sideChange;
      processedR -= sideChange;
      if (saturation > 0) {
        processedL += saturation * (processedL / (1 + .75 * Math.abs(processedL)) - processedL);
        processedR += saturation * (processedR / (1 + .75 * Math.abs(processedR)) - processedR);
      }
      const targetAir = this.targetAir ?? 0;
      this.air = targetAir + this.smooth * (this.air - targetAir);
      this.finalLow[0] += this.airCoefficient * (processedL - this.finalLow[0]);
      this.finalLow[1] += this.airCoefficient * (processedR - this.finalLow[1]);
      processedL += this.air * (processedL - this.finalLow[0]);
      processedR += this.air * (processedR - this.finalLow[1]);

      const busPeak = Math.max(Math.abs(processedL), Math.abs(processedR));
      const detectorSpeed = busPeak > this.busLevel ? this.attack : this.recovery;
      this.busLevel = busPeak + detectorSpeed * (this.busLevel - busPeak);
      const busTarget = this.busSlope !== 0 && this.busLevel > this.busThreshold
        ? Math.pow(this.busLevel / this.busThreshold, this.busSlope) : 1;
      this.busGain = busTarget + this.smooth * (this.busGain - busTarget);
      processedL *= this.busGain;
      processedR *= this.busGain;

      const targetDrive = this.targetDrive ?? 1;
      const targetCeiling = this.targetCeiling ?? 1;
      this.drive = targetDrive + this.smooth * (this.drive - targetDrive);
      this.ceiling = targetCeiling + this.smooth * (this.ceiling - targetCeiling);
      const peak = Math.max(Math.abs(processedL), Math.abs(processedR)) * this.drive;
      const target = this.limiting && peak > this.ceiling ? this.ceiling / peak : 1;
      const recover = this.limiting ? this.release : this.smooth;
      this.limitGain = Math.min(target, target + recover * (this.limitGain - target));
      const outL = processedL * this.drive * this.limitGain;
      const outR = processedR * this.drive * this.limitGain;
      output[0][i] = outL;
      if (output[1]) output[1][i] = outR;
      if (this.meters) {
        this.energy[0] += outL * outL;
        this.energy[1] += outR * outR;
        this.energy[2] += outL * outR;
      }
    }
    if (this.meters && ++this.frame % 14 === 0) {
      const norm = Math.sqrt(this.energy[0] * this.energy[1]);
      this.port.postMessage({
        bands: Array.from(this.reductions), limit: this.limitGain, bus: this.busGain, deesser: this.deessGain,
        ducking: this.ducker.gain, duckTriggers: this.ducker.triggers,
        correlation: norm > 1e-8 ? Math.max(-1, Math.min(1, this.energy[2] / norm)) : 0,
      });
      this.energy.fill(0);
    }
    return true;
  }
}

registerProcessor("mastering-lab-preview", MasteringLabPreview);

class KickBassStems extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ducker = new BassDucker();
    this.configure(options?.processorOptions?.settings ?? {});
    this.meters = options?.processorOptions?.meters !== false;
    this.block = 0;
    this.port.onmessage = ({data}) => this.configure(data);
  }

  configure(data) {
    this.ducker.configure(data, hz => 1 - Math.exp(-2 * Math.PI * hz / sampleRate));
  }

  process(inputs, outputs) {
    const kick = inputs[0], bass = inputs[1], output = outputs[0];
    const ducker = this.ducker;
    for (let i = 0; i < output[0].length; i++) {
      const left = kick[0]?.[i] ?? 0, right = kick[1]?.[i] ?? left;
      ducker.track(left, right);
      for (let channel = 0; channel < output.length; channel++)
        output[channel][i] = (bass[channel]?.[i] ?? bass[0]?.[i] ?? 0) * ducker.gain;
    }
    if (this.meters && ++this.block % 10 === 0)
      this.port.postMessage({gain:ducker.gain,triggers:ducker.triggers});
    return true;
  }
}
registerProcessor("kick-bass-stems", KickBassStems);
