import { labMaxBytes } from "@/lib/masteringLab";
import { neutral, type Settings } from "./settings";

export function appliedAutoProfile(profile: Record<string, unknown>, lufs: number, peak: number): Settings {
  const bounded = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  const field = (key: string, fallback: number, min: number, max: number) => bounded(profile[key], fallback, min, max);
  const intensity = field("processing_intensity", 65, 0, 100);
  const saturation = Math.round(field("saturation_amount", 0, 0, 1) * 1000) / 10;
  const finalAir = field("final_air_gain", 0, -6, 6);
  const width = Math.round(field("stereo_width", 1, 0, 1.75) * 100);
  const monoBass = Math.round(field("bass_mono_amount", 0, 0, 1) * 100);
  const busRatio = field("bus_comp_ratio", 1, 1, 4);
  const bands = ["sub", "low", "mid", "high"].map(name => ({
    ratio: field(`mb_${name}_ratio`, 1, 1, 8),
    threshold: field(`mb_${name}_threshold`, -22, -48, 0),
  }));
  const eqFrequency = [
    field("low_shelf_freq", 80, 30, 220), field("mid_notch_freq", 280, 120, 900),
    field("presence_freq", 3000, 800, 6000), field("air_freq", 12000, 4000, 16000),
  ];
  const trim = lufs <= -70 ? 0 : bounded(Math.min(-18 - lufs, -.18 - peak), 0, -18, 12);
  return {
    ...neutral,
    active: {
      ...neutral.active,
      input: intensity > 0, eq: intensity > 0, dynamics: intensity > 0 && bands.some(band => band.ratio > 1),
      deesser: intensity > 0, stereo: intensity > 0 && (width !== 100 || monoBass > 0),
      saturation: intensity > 0 && saturation > 0, finalEq: intensity > 0 && finalAir !== 0,
      bus: intensity > 0 && busRatio > 1, limiter: true,
    },
    trim: Math.round(trim * 10) / 10,
    eqFrequency, eqQ: [.85, field("mid_notch_q", 2, .25, 5), .85, .85],
    eq: ["low_shelf_gain", "mid_notch_gain", "presence_gain", "air_gain"].map(key => field(key, 0, -9, 9)),
    highpass: field("highpass_freq", 0, 0, 200),
    bands, width, monoBass, saturation, finalAir, busRatio,
    deessAmount: Math.round(60 * intensity / 100),
    busThreshold: field("bus_comp_threshold", -20, -48, 0),
    ceiling: field("true_peak_ceiling", -1, -6, 0),
  };
}

export function wavByteLength(frames: number) {
  return 44 + frames * 8;
}

export function deliveryWav(buffer: AudioBuffer) {
  const length = wavByteLength(buffer.length);
  if (length > labMaxBytes) throw new RangeError("Audio exceeds the export size limit");
  const header = new DataView(new ArrayBuffer(44));
  const tag = (position: number, name: string) => {
    for (let i = 0; i < name.length; i++) header.setUint8(position + i, name.charCodeAt(i));
  };
  tag(0, "RIFF"); header.setUint32(4, length - 8, true); tag(8, "WAVE"); tag(12, "fmt ");
  header.setUint32(16, 16, true); header.setUint16(20, 3, true); header.setUint16(22, 2, true);
  header.setUint32(24, buffer.sampleRate, true); header.setUint32(28, buffer.sampleRate * 8, true);
  header.setUint16(32, 8, true); header.setUint16(34, 32, true);
  tag(36, "data"); header.setUint32(40, length - 44, true);
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels === 2 ? buffer.getChannelData(1) : left;
  const blocks: ArrayBuffer[] = [header.buffer];
  const size = 65536;
  for (let start = 0; start < buffer.length; start += size) {
    const frames = Math.min(size, buffer.length - start);
    const block = new DataView(new ArrayBuffer(frames * 8));
    for (let i = 0; i < frames; i++) {
      block.setFloat32(i * 8, left[start + i], true);
      block.setFloat32(i * 8 + 4, right[start + i], true);
    }
    blocks.push(block.buffer);
  }
  return new Blob(blocks, { type: "audio/wav" });
}
