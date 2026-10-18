import type { WavDepth } from "@/lib/clientAudio";
import type { Spectrum, StereoResult } from "@/lib/workerAnalysis";

type Task = { kind: "wav"; depth: WavDepth; dither: boolean } | { kind: "range"; threshold: number } | { kind: "spectrum" | "stereo" | "waveform" };
async function run(buffer: AudioBuffer, task: Task, signal?: AbortSignal): Promise<unknown> {
  signal?.throwIfAborted();
  if (buffer.length < 1 || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2 || buffer.length * buffer.numberOfChannels > 64_000_000)
    throw Error("Audio exceeds the browser memory budget");
  if (typeof Worker === "undefined") throw Error("Web Workers are required for this audio tool");
  const worker = new Worker(new URL("./audioExport.worker.ts", import.meta.url), { type: "module" });
  return new Promise((resolve, reject) => {
    const finish = (error?: Error, result?: unknown) => {
      signal?.removeEventListener("abort", abort);
      clearTimeout(timer); worker.terminate(); error ? reject(error) : resolve(result);
    };
    const timer = setTimeout(() => finish(Error("TIMEOUT")), 120_000);
    const abort = () => finish(new DOMException("Cancelled", "AbortError"));
    signal?.addEventListener("abort", abort, {once:true});
    worker.onerror = () => finish(Error("Audio worker failed"));
    worker.onmessageerror = () => finish(Error("Audio worker response invalid"));
    worker.onmessage = event => event.data?.error ? finish(Error(event.data.error)) : finish(undefined, event.data?.result);
    try {
      // Transfer copies, never the AudioBuffer's live playback channels.
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i).slice());
      worker.postMessage({ task, channels, sampleRate: buffer.sampleRate }, channels.map(channel => channel.buffer));
    } catch { finish(Error("Audio worker could not start")); }
  });
}
export async function encodeWavAsync(buffer: AudioBuffer, depth: WavDepth = "24", dither = true, signal?: AbortSignal): Promise<Blob> {
  const result = await run(buffer, { kind: "wav", depth, dither }, signal);
  if (!(result instanceof Blob) || result.size < 44) throw Error("Invalid WAV export");
  return result;
}
export async function findActiveRangeAsync(buffer: AudioBuffer, threshold = -50, signal?: AbortSignal): Promise<{ start: number; end: number; active: boolean }> {
  const result = await run(buffer, { kind: "range", threshold }, signal) as { start: number; end: number; active: boolean };
  if (!result || !Number.isFinite(result.start) || !Number.isFinite(result.end) || result.start < 0 || result.end < result.start || result.end > buffer.duration + .001)
    throw Error("Invalid audio range");
  return result;
}
export async function analyzeSpectrumAsync(buffer: AudioBuffer, signal?: AbortSignal): Promise<Spectrum> {
  return await run(buffer, { kind: "spectrum" }, signal) as Spectrum;
}
export async function inspectStereoAsync(buffer: AudioBuffer, signal?: AbortSignal): Promise<StereoResult> {
  return await run(buffer, { kind: "stereo" }, signal) as StereoResult;
}
export async function waveformPeaksAsync(buffer: AudioBuffer, signal?: AbortSignal): Promise<Float32Array> {
  return await run(buffer, { kind: "waveform" }, signal) as Float32Array;
}
