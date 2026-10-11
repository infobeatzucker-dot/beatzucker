export type WavDepth = "16" | "24" | "32f";

const MAX_DECODED_SAMPLES = 64_000_000;

export function inspectAudioMetadata(bytes: ArrayBuffer): { sampleRate: number; channels: number; frames: number } | null {
  const view = new DataView(bytes);
  const text = (offset: number, length: number) => String.fromCharCode(...new Uint8Array(bytes, offset, length));
  if (bytes.byteLength < 12) return null;
  if (text(0, 4) === "RIFF" && text(8, 4) === "WAVE") {
    let sampleRate = 0, channels = 0, blockAlign = 0, dataSize = 0;
    for (let offset = 12; offset + 8 <= bytes.byteLength;) {
      const size = view.getUint32(offset + 4, true);
      if (offset + 8 + size > bytes.byteLength) throw new Error("Invalid WAV chunk");
      const id = text(offset, 4);
      if (id === "fmt " && size >= 16) {
        channels = view.getUint16(offset + 10, true);
        sampleRate = view.getUint32(offset + 12, true);
        blockAlign = view.getUint16(offset + 20, true);
      }
      if (id === "data") dataSize += size;
      offset += 8 + size + (size % 2);
    }
    if (sampleRate && channels && blockAlign) return { sampleRate, channels, frames: Math.floor(dataSize / blockAlign) };
  }
  if (text(0, 4) === "fLaC" && bytes.byteLength >= 42 && (view.getUint8(4) & 127) === 0) {
    const sampleRate = (view.getUint8(18) << 12) | (view.getUint8(19) << 4) | (view.getUint8(20) >> 4);
    const channels = ((view.getUint8(20) >> 1) & 7) + 1;
    const frames = (view.getUint8(21) & 15) * 4294967296 + view.getUint32(22, false);
    return { sampleRate, channels, frames };
  }
  return null;
}

export async function decodeAudio(file: File, maxBytes = 80 * 1024 * 1024) {
  if (file.size <= 0 || file.size > maxBytes) throw new Error("SIZE");
  const bytes = await file.arrayBuffer();
  const metadata = inspectAudioMetadata(bytes);
  if (metadata && (metadata.channels < 1 || metadata.channels > 2)) throw new Error("Only mono and stereo audio are supported");
  if (metadata && metadata.frames * metadata.channels > MAX_DECODED_SAMPLES) throw new Error("Audio exceeds the browser memory budget");
  // Preserve known native rates instead of resampling WAV/FLAC to the device rate.
  const context = new OfflineAudioContext(2, 1, metadata?.sampleRate || 48000);
  const decoded = await context.decodeAudioData(bytes);
  if (decoded.numberOfChannels > 2) throw new Error("Only mono and stereo audio are supported");
  if (decoded.length * decoded.numberOfChannels > MAX_DECODED_SAMPLES) throw new Error("Audio exceeds the browser memory budget");
  return decoded;
}

function writeText(view: DataView, offset: number, value: string) { for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index)); }

export function encodeWav(buffer: AudioBuffer, depth: WavDepth = "24", dither = true) {
  if (buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) throw new Error("Only mono and stereo audio are supported");
  const channels = buffer.numberOfChannels, bits = depth === "32f" ? 32 : Number(depth), bytes = bits / 8;
  const frames = buffer.length, dataSize = frames * channels * bytes, output = new ArrayBuffer(44 + dataSize), view = new DataView(output);
  writeText(view, 0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeText(view, 8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, depth === "32f" ? 3 : 1, true); view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * bytes, true); view.setUint16(32, channels * bytes, true); view.setUint16(34, bits, true); writeText(view, 36, "data"); view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) for (let channel = 0; channel < channels; channel++) {
    let sample = buffer.getChannelData(channel)[frame];
    if (!Number.isFinite(sample)) sample = 0;
    if (depth === "32f") { view.setFloat32(offset, sample, true); offset += 4; continue; }
    sample = Math.max(-1, Math.min(1, sample));
    const scale = depth === "16" ? 32767 : 8388607; if (dither) sample += (Math.random() - Math.random()) / scale;
    const value = Math.max(-scale - 1, Math.min(scale, Math.round(sample * scale)));
    if (depth === "16") { view.setInt16(offset, value, true); offset += 2; }
    else { view.setUint8(offset, value & 255); view.setUint8(offset + 1, (value >> 8) & 255); view.setUint8(offset + 2, (value >> 16) & 255); offset += 3; }
  }
  return new Blob([output], { type: "audio/wav" });
}

export async function resampleAudio(input: AudioBuffer, rate: number) {
  if (input.sampleRate === rate) return input;
  const context = new OfflineAudioContext(Math.min(2, input.numberOfChannels), Math.ceil(input.duration * rate), rate), source = context.createBufferSource(); source.buffer = input; source.connect(context.destination); source.start(); return context.startRendering();
}

export function findActiveRange(buffer: AudioBuffer, thresholdDb = -50) {
  const hop = Math.max(128, Math.floor(buffer.sampleRate * .01)), threshold = Math.pow(10, thresholdDb / 20); let first = 0, last = buffer.length - 1, found = false;
  for (let start = 0; start < buffer.length; start += hop) { let sum = 0, count = 0; for (let channel = 0; channel < buffer.numberOfChannels; channel++) { const data = buffer.getChannelData(channel); for (let index = start; index < Math.min(start + hop, buffer.length); index++) { sum += data[index] ** 2; count++; } } if (Math.sqrt(sum / Math.max(1, count)) >= threshold) { first = start; found = true; break; } }
  if (!found) return { start: 0, end: buffer.duration };
  for (let start = buffer.length - hop; start >= 0; start -= hop) { let sum = 0, count = 0; for (let channel = 0; channel < buffer.numberOfChannels; channel++) { const data = buffer.getChannelData(channel); for (let index = Math.max(0, start); index < Math.min(start + hop, buffer.length); index++) { sum += data[index] ** 2; count++; } } if (Math.sqrt(sum / Math.max(1, count)) >= threshold) { last = Math.min(buffer.length - 1, start + hop); break; } }
  return { start: Math.max(0, first / buffer.sampleRate - .05), end: Math.min(buffer.duration, last / buffer.sampleRate + .05) };
}
