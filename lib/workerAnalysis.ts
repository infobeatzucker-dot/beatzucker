export type Spectrum = { frequencies: number[]; levels: number[]; activity: number[]; duration: number };
const FFT_SIZE = 4096; const BINS = 42; const MIN_HZ = 35; const MAX_HZ = 350;

function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; } }
  for (let length = 2; length <= n; length <<= 1) { const angle = -2 * Math.PI / length; const wLenR = Math.cos(angle); const wLenI = Math.sin(angle); for (let i = 0; i < n; i += length) { let wr = 1, wi = 0; for (let j = 0; j < length / 2; j++) { const even = i + j, odd = even + length / 2; const vr = real[odd] * wr - imag[odd] * wi, vi = real[odd] * wi + imag[odd] * wr; const ur = real[even], ui = imag[even]; real[even] = ur + vr; imag[even] = ui + vi; real[odd] = ur - vr; imag[odd] = ui - vi; const nextR = wr * wLenR - wi * wLenI; wi = wr * wLenI + wi * wLenR; wr = nextR; } } }
}

export function analyzeSpectrum(buffer: AudioBuffer): Spectrum {
  const frames = Math.min(56, Math.max(12, Math.floor(buffer.duration * 1.5)));
    const sums = new Float64Array(BINS); const activity = new Float64Array(frames); const frequencies = Array.from({ length: BINS }, (_, index) => MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, index / (BINS - 1)));
    for (let frame = 0; frame < frames; frame++) {
      const center = Math.floor((frame + .5) / frames * buffer.length); const start = Math.max(0, Math.min(buffer.length - FFT_SIZE, center - FFT_SIZE / 2));
      const real = new Float64Array(FFT_SIZE); const imag = new Float64Array(FFT_SIZE);
      for (let i = 0; i < FFT_SIZE; i++) { let sample = 0; for (let channel = 0; channel < buffer.numberOfChannels; channel++) sample += buffer.getChannelData(channel)[start + i] ?? 0; real[i] = sample / buffer.numberOfChannels * (.5 - .5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1))); }
      fft(real, imag); let frameEnergy = 0;
      for (let bin = 0; bin < BINS; bin++) { const fftBin = Math.max(1, Math.min(FFT_SIZE / 2 - 1, Math.round(frequencies[bin] * FFT_SIZE / buffer.sampleRate))); const power = real[fftBin] ** 2 + imag[fftBin] ** 2; sums[bin] += power; frameEnergy += power; }
      activity[frame] = frameEnergy;
    }
    const db = Array.from(sums, value => 10 * Math.log10(value / frames + 1e-14)); const floor = Math.max(...db) - 48;
    const levels = db.map(value => Math.max(0, Math.min(1, (value - floor) / 48))); const activityMax = Math.max(...activity, 1e-12);
    return { frequencies, levels, activity: Array.from(activity, value => Math.sqrt(value / activityMax)), duration: buffer.duration };
}


export type StereoResult={correlation:number;width:number;monoLoss:number;balance:number;points:[number,number][];bands:{name:string;correlation:number}[]};
function bandCorrelations(left:Float32Array,right:Float32Array,sampleRate:number){
  // Filter at the native rate: dropping samples first aliases treble into bass.
  const aLow=1-Math.exp(-2*Math.PI*160/sampleRate),aMid=1-Math.exp(-2*Math.PI*4000/sampleRate),sums=Array.from({length:3},()=>({l:0,r:0,lr:0}));let lowL=0,lowR=0,wideL=0,wideR=0;
  for(let i=0;i<left.length;i++){const l=left[i],r=right[i];lowL+=aLow*(l-lowL);lowR+=aLow*(r-lowR);wideL+=aMid*(l-wideL);wideR+=aMid*(r-wideR);const ls=[lowL,wideL-lowL,l-wideL],rs=[lowR,wideR-lowR,r-wideR];for(let b=0;b<3;b++){sums[b].l+=ls[b]**2;sums[b].r+=rs[b]**2;sums[b].lr+=ls[b]*rs[b];}}
  return sums.map((sum,index)=>({name:["20–160 Hz","160 Hz–4 kHz","4–20 kHz"][index],correlation:sum.lr/Math.sqrt(Math.max(1e-20,sum.l*sum.r))}));
}
export function inspectStereo(buffer:AudioBuffer):StereoResult{
  const monoBands=["20–160 Hz","160 Hz–4 kHz","4–20 kHz"].map(name=>({name,correlation:1}));if(buffer.numberOfChannels<2)return{correlation:1,width:0,monoLoss:0,balance:0,points:[],bands:monoBands};
  const l=buffer.getChannelData(0),r=buffer.getChannelData(1),pointStep=Math.max(1,Math.ceil(l.length/1800));let ll=0,rr=0,lr=0,mid=0,side=0,n=0,nextPoint=0;const points:[number,number][]=[];
  for(let i=0;i<l.length;i++){ll+=l[i]**2;rr+=r[i]**2;lr+=l[i]*r[i];const m=(l[i]+r[i])*.5,s=(l[i]-r[i])*.5;mid+=m*m;side+=s*s;n++;if(i>=nextPoint){points.push([m,s]);nextPoint+=pointStep;}}
  const correlation=lr/Math.sqrt(Math.max(1e-20,ll*rr)),width=Math.sqrt(side/Math.max(1e-20,mid)),stereoRms=Math.sqrt((ll+rr)/(2*n)),monoRms=Math.sqrt(mid/n);
  return{correlation,width,monoLoss:20*Math.log10(Math.max(1e-10,monoRms)/Math.max(1e-10,stereoRms)),balance:10*Math.log10(Math.max(1e-20,ll)/Math.max(1e-20,rr)),points,bands:bandCorrelations(l,r,buffer.sampleRate)};
}
