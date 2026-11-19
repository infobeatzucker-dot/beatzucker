/* Shared, zero-lookahead DSP for live and offline AudioWorklet rendering.
 * The residual high band is exactly x-low: at 0% it sums back to x without
 * a crossover notch or differently delayed branches. Stereo gains are linked.
 */
export class VocalDynamics {
  constructor(rate, channels = 2) {
    this.low = new Float64Array(channels);
    this.alpha = 1 - Math.exp(-2 * Math.PI * 6500 / rate);
    this.deessEnvelope = 0; this.compEnvelope = 0;
    this.deessReduction = 0; this.compReduction = 0;
    this.fastAttack = Math.exp(-1 / (.002 * rate)); this.fastRelease = Math.exp(-1 / (.08 * rate));
    this.attack = Math.exp(-1 / (.012 * rate)); this.release = Math.exp(-1 / (.12 * rate));
  }
  process(inputs, outputs, deess = 0, comp = 0) {
    const frames = outputs[0]?.length || 0;
    let deessReduction = 0, compReduction = 0;
    for (let i = 0; i < frames; i++) {
      const d = (deess.length ? deess[Math.min(i,deess.length-1)] : deess) / 100;
      const c = (comp.length ? comp[Math.min(i,comp.length-1)] : comp) / 100;
      let highPeak = 0, fullPeak = 0;
      for (let ch = 0; ch < outputs.length; ch++) {
        const x = inputs[ch]?.[i] || 0;
        this.low[ch] += this.alpha * (x-this.low[ch]);
        highPeak = Math.max(highPeak, Math.abs(x-this.low[ch]));
        fullPeak = Math.max(fullPeak, Math.abs(x));
      }
      const a = highPeak>this.deessEnvelope ? this.fastAttack : this.fastRelease;
      this.deessEnvelope = a*this.deessEnvelope + (1-a)*highPeak;
      const b = fullPeak>this.compEnvelope ? this.attack : this.release;
      this.compEnvelope = b*this.compEnvelope + (1-b)*fullPeak;
      const dOver = Math.max(0, 20*Math.log10(Math.max(1e-10,this.deessEnvelope))-(-12-38*d));
      const cOver = Math.max(0, 20*Math.log10(Math.max(1e-10,this.compEnvelope))-(-8-30*c));
      const dDb = d===0 ? 0 : Math.min(12,dOver*(5/6))*d;
      const cDb = c===0 ? 0 : cOver*(1-1/(1+3.5*c));
      const dg = dDb === 0 ? 1 : Math.pow(10,-dDb/20);
      const cg = cDb === 0 ? 1 : Math.pow(10,-cDb/20);
      deessReduction = Math.max(deessReduction, dDb);
      compReduction = Math.max(compReduction, cDb);
      for (let ch = 0; ch < outputs.length; ch++) {
        const x = inputs[ch]?.[i] || 0;
        outputs[ch][i] = (this.low[ch]+(x-this.low[ch])*dg)*cg;
      }
    }
    this.deessReduction = deessReduction;
    this.compReduction = compReduction;
  }
}

if (typeof registerProcessor === "function") {
  class VocalProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return ["deess","comp"].map(name=>({name,defaultValue:0,minValue:0,maxValue:100,automationRate:"a-rate"}));
    }
    constructor(options) {
      super();
      this.dsp = new VocalDynamics(sampleRate, 2);
      this.meter = !!options?.processorOptions?.meter;
      this.frames = 0; this.peakDeess = 0; this.peakComp = 0;
    }
    process(inputs,outputs,parameters) {
      if(outputs[0]?.length)this.dsp.process(inputs[0]||[],outputs[0],parameters.deess,parameters.comp);
      if (this.meter && outputs[0]?.[0]) {
        this.frames += outputs[0][0].length;
        this.peakDeess = Math.max(this.peakDeess, this.dsp.deessReduction);
        this.peakComp = Math.max(this.peakComp, this.dsp.compReduction);
        if (this.frames >= sampleRate / 16) {
          this.port.postMessage({ deess: this.peakDeess, comp: this.peakComp });
          this.frames = 0; this.peakDeess = 0; this.peakComp = 0;
        }
      }
      return true;
    }
  }
  registerProcessor("beatzucker-vocal-dynamics", VocalProcessor);
}
