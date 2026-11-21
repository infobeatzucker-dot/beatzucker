import { integratedLoudness, kWeight } from "./loudness";

export type Module = "input" | "eq" | "deesser" | "ducking" | "dynamics" | "stereo" | "saturation" | "finalEq" | "bus" | "limiter";
export type Band = { threshold: number; ratio: number };
export type Settings = {
  active: Record<Module, boolean>;
  eq: number[];
  eqFrequency: number[];
  eqQ: number[];
  highpass: number;
  bands: Band[];
  trim: number;
  deessFrequency: number;
  deessThreshold: number;
  deessAmount: number;
  duckDepth: number;
  duckFrequency: number;
  duckThreshold: number;
  duckRelease: number;
  width: number;
  monoBass: number;
  saturation: number;
  finalAir: number;
  finalFrequency: number;
  busThreshold: number;
  busRatio: number;
  drive: number;
  ceiling: number;
  release: number;
};

export const frequencies = [90, 300, 2600, 11000];
export const ranges = ["< 80 Hz", "80–500 Hz", "0.5–5 kHz", "> 5 kHz"];
export const neutral: Settings = {
  active: { input: true, eq: true, deesser: false, ducking: false, dynamics: false, stereo: false, saturation: false, finalEq: false, bus: false, limiter: false },
  eq: [0, 0, 0, 0],
  eqFrequency: frequencies,
  eqQ: [.85, .85, .85, .85],
  highpass: 0,
  bands: frequencies.map(() => ({ threshold: -22, ratio: 1 })),
  trim: 0,
  deessFrequency: 6800,
  deessThreshold: -24,
  deessAmount: 0,
  duckDepth: 2,
  duckFrequency: 85,
  duckThreshold: -31,
  duckRelease: 145,
  width: 100,
  monoBass: 0,
  saturation: 0,
  finalAir: 0,
  finalFrequency: 12000,
  busThreshold: -20,
  busRatio: 1,
  drive: 0,
  ceiling: -1,
  release: 120,
};

type Preset = {
  name: readonly [string, string];
  description: readonly [string, string];
  eq: readonly number[];
  ratio: readonly number[];
  drive: number;
  width?: number;
  monoBass?: number;
  saturation?: number;
  deessAmount?: number;
};

export const presets: readonly Preset[] = [
  { name: ["Neutral", "Neutral"], description: ["Unbearbeiteter Ausgangspunkt", "Unprocessed starting point"], eq: neutral.eq, ratio: [1, 1, 1, 1], drive: 0 },
  { name: ["Klar & ausgewogen", "Clean & balanced"], description: ["Dezente Präsenz und leichte Verdichtung", "Subtle presence and gentle compression"], eq: [.3, -.7, .6, .5], ratio: [1.2, 1.3, 1.3, 1.15], drive: 1.3 },
  { name: ["Warm & weich", "Warm & smooth"], description: ["Voller Grundton und ruhigere Höhen", "Fuller lows and softer highs"], eq: [1, .3, -.4, -1.1], ratio: [1.35, 1.3, 1.2, 1.3], drive: 1 },
  { name: ["Club Punch", "Club punch"], description: ["Kräftiger Tiefton und mehr Druck", "Solid lows and more impact"], eq: [1.3, -.9, .4, .4], ratio: [1.7, 1.6, 1.3, 1.2], drive: 3 },
  { name: ["Offen & präsent", "Open & present"], description: ["Weniger tiefere Mitten, mehr Luft", "Less low-mid weight and more air"], eq: [-.4, -.9, .8, 1.4], ratio: [1.15, 1.25, 1.35, 1.2], drive: 1.4 },
  { name: ["Pop", "Pop"], description: ["Präsente Vocals und kontrollierter Bass", "Present vocals and controlled bass"], eq: [.5, -.8, 1, .6], ratio: [1.4, 1.5, 1.45, 1.25], drive: 1.8, deessAmount: 22 },
  { name: ["Electronic / Dance", "Electronic / Dance"], description: ["Klarer Subbass und breiteres Panorama", "Defined sub and a wider image"], eq: [1.1, -.7, .3, .8], ratio: [1.65, 1.55, 1.25, 1.2], drive: 2.6, width: 111, monoBass: 28 },
  { name: ["Hip-Hop / Trap", "Hip-hop / Trap"], description: ["Tiefer Bass und klarer Vocal-Fokus", "Deep bass and a clear vocal focus"], eq: [1.5, -.6, .7, -.2], ratio: [1.65, 1.35, 1.4, 1.15], drive: 2, monoBass: 32 },
  { name: ["Rock", "Rock"], description: ["Straffe tiefe Mitten und Gitarrenpräsenz", "Tighter low mids and guitar presence"], eq: [.4, -.9, .85, .3], ratio: [1.35, 1.55, 1.5, 1.35], drive: 1.8, saturation: 12 },
  { name: ["Metal", "Metal"], description: ["Kontrollierter Tiefton und weniger harte Präsenzen", "Controlled lows and softer upper mids"], eq: [.55, -1.1, -.45, .55], ratio: [1.6, 1.7, 1.4, 1.3], drive: 2.1, deessAmount: 16 },
  { name: ["R&B / Soul", "R&B / Soul"], description: ["Warmer Grundton und sanfte Höhen", "Warm body and gentle highs"], eq: [.75, .3, -.3, -.6], ratio: [1.3, 1.35, 1.25, 1.22], drive: 1, saturation: 14, deessAmount: 15 },
  { name: ["Jazz", "Jazz"], description: ["Leichte Klangkorrektur mit viel Dynamik", "Subtle tonal changes with plenty of dynamics"], eq: [.35, -.2, .2, .25], ratio: [1.12, 1.13, 1.1, 1.1], drive: .4 },
  { name: ["Klassik", "Classical"], description: ["Zurückhaltende Korrektur für dynamisches Material", "Gentle correction for dynamic recordings"], eq: [0, -.2, .1, .15], ratio: [1, 1, 1, 1], drive: 0 },
  { name: ["Akustik / Folk", "Acoustic / Folk"], description: ["Mehr Definition mit sanftem Bass", "More definition with gentle lows"], eq: [-.5, -.7, .45, .35], ratio: [1.1, 1.2, 1.3, 1.15], drive: .75, deessAmount: 12 },
  { name: ["Ambient", "Ambient"], description: ["Sanfte Präsenz und etwas mehr Raum", "Soft presence and a little more space"], eq: [-.15, -.45, -.2, .65], ratio: [1.12, 1.1, 1.12, 1.1], drive: .55, width: 112, monoBass: 12 },
];
export const genreStart = 5;

export function presetSettings(index: number): Settings {
  const preset = presets[index];
  if (!preset || index === 0) return neutral;
  return {
    ...neutral,
    active: {
      ...neutral.active,
      dynamics: preset.ratio.some(ratio => ratio > 1),
      stereo: preset.width !== undefined || preset.monoBass !== undefined,
      saturation: Boolean(preset.saturation), deesser: Boolean(preset.deessAmount), limiter: true,
    },
    eq: [...preset.eq],
    bands: preset.ratio.map((ratio, index) => ({ threshold: [-20, -22, -25, -29][index], ratio })),
    drive: preset.drive,
    width: preset.width ?? neutral.width,
    monoBass: preset.monoBass ?? neutral.monoBass,
    saturation: preset.saturation ?? neutral.saturation,
    deessAmount: preset.deessAmount ?? neutral.deessAmount,
  };
}

const moduleKeys = {
  input: ["trim"],
  eq: ["eq", "eqFrequency", "eqQ", "highpass"],
  deesser: ["deessFrequency", "deessThreshold", "deessAmount"],
  ducking: ["duckDepth", "duckFrequency", "duckThreshold", "duckRelease"],
  dynamics: ["bands"],
  stereo: ["width", "monoBass"],
  saturation: ["saturation"],
  finalEq: ["finalAir", "finalFrequency"],
  bus: ["busThreshold", "busRatio"],
  limiter: ["drive", "ceiling", "release"],
} as const satisfies Record<Module, readonly (keyof Settings)[]>;

export function resetModule(module: Module): Partial<Settings> {
  return Object.fromEntries(moduleKeys[module].map(key => [key, neutral[key]]));
}

export function dbGain(db: number) {
  return 10 ** (db / 20);
}

export function toDb(amplitude: number) {
  return Math.max(-90, 20 * Math.log10(Math.max(.000001, amplitude)));
}

export function inspect(buffer: AudioBuffer, compareEnergy = true) {
  const bins = Math.min(16384, buffer.length);
  const minimum = new Float32Array(bins).fill(Infinity);
  const maximum = new Float32Array(bins).fill(-Infinity);
  const energy = compareEnergy ? new Float64Array(bins) : undefined;
  const moment = Math.max(1, Math.round(buffer.sampleRate * .1));
  const weighted = new Float64Array(Math.ceil(buffer.length / moment));
  let peak = 0;
  let sum = 0;
  let samples = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const pcm = buffer.getChannelData(channel);
    const filter = kWeight(buffer.sampleRate);
    let frame = 0, boundary = moment, block = 0;
    for (let i = 0; i < pcm.length; i++) {
      const sample = pcm[i];
      const amplitude = Math.abs(sample);
      const bin = Math.floor(i / pcm.length * bins);
      minimum[bin] = Math.min(minimum[bin], sample);
      maximum[bin] = Math.max(maximum[bin], sample);
      peak = Math.max(peak, amplitude);
      const power = sample * sample;
      if (energy) energy[bin] += power;
      sum += power;
      const signal = filter(sample);
      block += signal * signal;
      if (i + 1 === boundary) {
        weighted[frame++] += block;
        boundary += moment;
        block = 0;
      }
      samples++;
    }
  }
  return {
    waveform: { minimum, maximum }, energy, peak: toDb(peak), rms: toDb(Math.sqrt(sum / samples)),
    lufs: integratedLoudness(weighted, moment, buffer.length), seconds: buffer.duration, rate: buffer.sampleRate,
  };
}

export type Waveform = ReturnType<typeof inspect>["waveform"];

export function loudestPassage(energy: Float64Array, duration: number, seconds: number): [number, number] {
  const length = Math.min(duration, seconds);
  if (!energy.length || duration <= length) return [0, duration];
  const window = Math.max(1, Math.round(energy.length * length / duration));
  let sum = 0, best = -1, index = 0;
  for (let i = 0; i < energy.length; i++) {
    sum += energy[i];
    if (i >= window) sum -= energy[i - window];
    if (i >= window - 1 && sum > best) {
      best = sum;
      index = i - window + 1;
    }
  }
  const start = Math.min(duration - length, index * duration / energy.length);
  return [start, start + length];
}
