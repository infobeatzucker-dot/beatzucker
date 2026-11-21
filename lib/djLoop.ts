import { createAudioCut, cutFrames, fadeGain } from "./audioCut";

export function barLength(bpm: number, bars: number, beats: number) {
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 240 || ![1,2,4,8,16,32].includes(bars) || ![3,4].includes(beats)) throw Error("CUT_RANGE");
  return 60 * beats * bars / bpm;
}

export function createDjLoop(buffer: AudioBuffer, start: number, duration: number, repetitions = 1, edgeFade = .003) {
  const bounds = cutFrames(buffer.duration, buffer.sampleRate, start, start + duration);
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 8) throw Error("CUT_RANGE");
  if (repetitions === 1) return createAudioCut(buffer, start, start + duration, edgeFade, edgeFade);
  const length = buffer.length + bounds.frames * (repetitions - 1);
  const samples = length * buffer.numberOfChannels;
  if (samples > 64_000_000 || buffer.length * buffer.numberOfChannels * 4 + samples * 16 > 512 * 1024 * 1024) throw Error("MEMORY");
  const output = new AudioBuffer({length, sampleRate:buffer.sampleRate, numberOfChannels:buffer.numberOfChannels});
  const fade = Math.min(Math.round(buffer.sampleRate * edgeFade), Math.floor(bounds.frames / 2));
  for (let ch=0; ch<buffer.numberOfChannels; ch++) {
    const original=buffer.getChannelData(ch), result=output.getChannelData(ch);
    result.set(original.subarray(0,bounds.first));
    for (let repeat=0; repeat<repetitions; repeat++) {
      const offset=bounds.first+repeat*bounds.frames;
      for (let i=0; i<bounds.frames; i++) {
        const gain=fadeGain(i,bounds.frames,repeat > 0 ? fade : 0,repeat < repetitions-1 ? fade : 0);
        result[offset+i]=original[bounds.first+i]*gain;
      }
    }
    result.set(original.subarray(bounds.last),bounds.first+bounds.frames*repetitions);
  }
  return output;
}
