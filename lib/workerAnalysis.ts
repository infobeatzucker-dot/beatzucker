export type Spectrum = { frequencies: number[]; levels: number[]; activity: number[]; duration: number; valid: boolean; resolutionHz: number; activityStep: number };
const FFT_SIZE = 8192; const BINS = 42; const MIN_HZ = 35; const MAX_HZ = 350;

function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; } }
  for (let length = 2; length <= n; length <<= 1) { const angle = -2 * Math.PI / length; const wLenR = Math.cos(angle); const wLenI = Math.sin(angle); for (let i = 0; i < n; i += length) { let wr = 1, wi = 0; for (let j = 0; j < length / 2; j++) { const even = i + j, odd = even + length / 2; const vr = real[odd] * wr - imag[odd] * wi, vi = real[odd] * wi + imag[odd] * wr; const ur = real[even], ui = imag[even]; real[even] = ur + vr; imag[even] = ui + vi; real[odd] = ur - vr; imag[odd] = ui - vi; const nextR = wr * wLenR - wi * wLenI; wi = wr * wLenI + wi * wLenR; wr = nextR; } } }
}

export function analyzeSpectrum(buffer: AudioBuffer): Spectrum {
  const activityStep = .25, hop = Math.max(1, Math.min(FFT_SIZE / 2, Math.floor(buffer.sampleRate * activityStep)));
  const sums = new Float64Array(BINS), activity = new Float64Array(Math.ceil(buffer.duration / activityStep));
  const frequencies = Array.from({ length: BINS }, (_, i) => MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, i / (BINS - 1)));
  const window = Float64Array.from({length:FFT_SIZE}, (_, i) => .5 - .5 * Math.cos(2*Math.PI*i/(FFT_SIZE-1)));
  let frames = 0, energy = 0;
  // Continuous overlapping windows, zero-padding both ends. Analyze channels
  // independently before averaging power, so counterphase cannot erase energy.
  for (let start = -hop; start < buffer.length; start += hop) {
    let frameEnergy = 0; frames++;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel), real = new Float64Array(FFT_SIZE), imag = new Float64Array(FFT_SIZE);
      for (let i = 0; i < FFT_SIZE; i++) real[i] = (data[start+i] ?? 0) * window[i];
      fft(real, imag);
      for (let bin = 0; bin < BINS; bin++) {
        const k = Math.max(1, Math.min(FFT_SIZE/2-1, Math.round(frequencies[bin]*FFT_SIZE/buffer.sampleRate)));
        const power = (real[k]**2 + imag[k]**2) / (FFT_SIZE**2 * buffer.numberOfChannels);
        sums[bin] += power; frameEnergy += power;
      }
    }
    const time = Math.max(0, Math.min(buffer.duration - 1/buffer.sampleRate, (start+hop)/buffer.sampleRate));
    const index = Math.floor(time / activityStep);
    activity[index] = Math.max(activity[index], frameEnergy); energy += frameEnergy;
  }
  const valid = energy / frames > 1e-12;
  const db = Array.from(sums, v => 10*Math.log10(v/frames + 1e-20)), floor = Math.max(...db)-48;
  const levels = valid ? db.map(v => Math.max(0, Math.min(1,(v-floor)/48))) : frequencies.map(() => 0);
  const maximum = Math.max(...activity, 1e-20);
  return {frequencies, levels, activity:Array.from(activity, v => valid ? Math.sqrt(v/maximum) : 0), duration:buffer.duration, valid, resolutionHz:buffer.sampleRate/FFT_SIZE, activityStep};
}


export type StereoResult={correlation:number;width:number;widthDefined:boolean;valid:boolean;monoLoss:number;balance:number;points:[number,number][];bands:{name:string;correlation:number;valid:boolean}[]};
function bandCorrelations(left:Float32Array,right:Float32Array,sampleRate:number){
  // Filter at the native rate: dropping samples first aliases treble into bass.
  const aLow=1-Math.exp(-2*Math.PI*160/sampleRate),aMid=1-Math.exp(-2*Math.PI*4000/sampleRate),sums=Array.from({length:3},()=>({l:0,r:0,lr:0}));let lowL=0,lowR=0,wideL=0,wideR=0;
  for(let i=0;i<left.length;i++){const l=left[i],r=right[i];lowL+=aLow*(l-lowL);lowR+=aLow*(r-lowR);wideL+=aMid*(l-wideL);wideR+=aMid*(r-wideR);const ls=[lowL,wideL-lowL,l-wideL],rs=[lowR,wideR-lowR,r-wideR];for(let b=0;b<3;b++){sums[b].l+=ls[b]**2;sums[b].r+=rs[b]**2;sums[b].lr+=ls[b]*rs[b];}}
  return sums.map((sum,index)=>({name:["< 160 Hz","160 Hz–4 kHz","> 4 kHz"][index],valid:(sum.l+sum.r)/left.length>1e-12,correlation:sum.lr/Math.sqrt(Math.max(1e-20,sum.l*sum.r))}));
}
export function inspectStereo(buffer:AudioBuffer):StereoResult{
  const monoBands=["< 160 Hz","160 Hz–4 kHz","> 4 kHz"].map(name=>({name,correlation:1,valid:true}));if(buffer.numberOfChannels<2){const valid=buffer.getChannelData(0).some(v=>Math.abs(v)>1e-6);return{correlation:valid?1:0,width:0,widthDefined:valid,valid,monoLoss:0,balance:0,points:[],bands:monoBands.map(b=>({...b,valid}))};}
  const l=buffer.getChannelData(0),r=buffer.getChannelData(1),pointStep=Math.max(1,Math.ceil(l.length/1800));let ll=0,rr=0,lr=0,mid=0,side=0,n=0,nextPoint=0;const points:[number,number][]=[];
  for(let i=0;i<l.length;i++){ll+=l[i]**2;rr+=r[i]**2;lr+=l[i]*r[i];const m=(l[i]+r[i])*.5,s=(l[i]-r[i])*.5;mid+=m*m;side+=s*s;n++;if(i>=nextPoint){points.push([m,s]);nextPoint+=pointStep;}}
  const correlation=lr/Math.sqrt(Math.max(1e-20,ll*rr)),width=Math.sqrt(side/Math.max(1e-20,mid)),stereoRms=Math.sqrt((ll+rr)/(2*n)),monoRms=Math.sqrt(mid/n);
  const valid=(ll+rr)/n>1e-12,widthDefined=valid&&mid/(ll+rr)>1e-12;
  return{correlation,width:widthDefined?Math.min(20,width):0,widthDefined,valid,monoLoss:20*Math.log10(Math.max(1e-10,monoRms)/Math.max(1e-10,stereoRms)),balance:10*Math.log10(Math.max(1e-20,ll)/Math.max(1e-20,rr)),points,bands:bandCorrelations(l,r,buffer.sampleRate)};
}
