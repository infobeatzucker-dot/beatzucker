/* Shared, zero-lookahead DSP for live and offline AudioWorklet rendering.
 * The residual high band is exactly x-low: at 0% it sums back to x without
 * a crossover notch or differently delayed branches. Stereo gains are linked.
 */
export class VocalDynamics {
  constructor(rate, channels = 2) {
    this.low = new Float64Array(channels);
    this.alpha = 1 - Math.exp(-2 * Math.PI * 6500 / rate);
    this.deessEnvelope = 0; this.compEnvelope = 0;
    this.fastAttack = Math.exp(-1 / (.002 * rate)); this.fastRelease = Math.exp(-1 / (.08 * rate));
    this.attack = Math.exp(-1 / (.012 * rate)); this.release = Math.exp(-1 / (.12 * rate));
  }
  process(inputs, outputs, deess = 0, comp = 0) {
    const frames = outputs[0]?.length || 0;
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
      const dg = d===0 ? 1 : Math.pow(10,-Math.min(12,dOver*(5/6))*d/20);
      const cg = c===0 ? 1 : Math.pow(10,-cOver*(1-1/(1+3.5*c))/20);
      for (let ch = 0; ch < outputs.length; ch++) {
        const x = inputs[ch]?.[i] || 0;
        outputs[ch][i] = (this.low[ch]+(x-this.low[ch])*dg)*cg;
      }
    }
  }
}

if (typeof registerProcessor === "function") {
  class VocalProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return ["deess","comp"].map(name=>({name,defaultValue:0,minValue:0,maxValue:100,automationRate:"a-rate"}));
    }
    constructor() { super(); this.dsp = new VocalDynamics(sampleRate, 2); }
    process(inputs,outputs,parameters) {
      if(outputs[0]?.length)this.dsp.process(inputs[0]||[],outputs[0],parameters.deess,parameters.comp);
      return true;
    }
  }
  registerProcessor("beatzucker-vocal-dynamics", VocalProcessor);
}
