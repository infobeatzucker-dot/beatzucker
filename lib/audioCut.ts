export function cutFrames(duration: number, rate: number, start: number, end: number) {
  if (![duration,rate,start,end].every(Number.isFinite) || duration <= 0 || rate < 8000 || rate > 192000 || start < 0 || end > duration+.000001 || end-start < .05) throw Error("CUT_RANGE");
  const first = Math.round(start*rate), last = Math.min(Math.round(duration*rate),Math.round(end*rate));
  if (last <= first) throw Error("CUT_RANGE");
  return { first, last, frames: last-first };
}
export function fadeSeconds(value: number, duration: number) {
  if (!Number.isFinite(value) || value < 0 || value > 5) throw Error("CUT_FADE");
  return Math.min(value,duration/2);
}
export function fadeGain(index: number, frames: number, fadeIn: number, fadeOut: number) {
  const incoming = fadeIn > 1 ? Math.min(1,index/(fadeIn-1)) : 1;
  const outgoing = fadeOut > 1 ? Math.min(1,(frames-1-index)/(fadeOut-1)) : 1;
  return Math.min(incoming,outgoing);
}
export function createAudioCut(input: AudioBuffer, start: number, end: number, fadeIn: number, fadeOut: number) {
  const bounds = cutFrames(input.duration,input.sampleRate,start,end);
  const samples = bounds.frames*input.numberOfChannels;
  if (input.numberOfChannels < 1 || input.numberOfChannels > 2 || samples > 64_000_000 || input.length*input.numberOfChannels*4+samples*16 > 512*1024*1024) throw Error("MEMORY");
  const fi = Math.round(fadeSeconds(fadeIn,bounds.frames/input.sampleRate)*input.sampleRate);
  const fo = Math.round(fadeSeconds(fadeOut,bounds.frames/input.sampleRate)*input.sampleRate);
  const output = new AudioBuffer({ length: bounds.frames, numberOfChannels: input.numberOfChannels, sampleRate: input.sampleRate });
  for (let ch=0;ch<input.numberOfChannels;ch++) {
    const source = input.getChannelData(ch), target = output.getChannelData(ch);
    for (let i=0;i<bounds.frames;i++) { const value = source[bounds.first+i]; if (!Number.isFinite(value)) throw Error("Invalid audio sample"); target[i] = value*fadeGain(i,bounds.frames,fi,fo); }
  }
  return output;
}
