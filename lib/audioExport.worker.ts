import { encodeWav, findActiveRange } from "./clientAudio";
import type { WavDepth } from "./clientAudio";
import { analyzeSpectrum, inspectStereo } from "./workerAnalysis";

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown) => void;
};
scope.onmessage = event => {
  try {
    const { channels, sampleRate, task } = event.data as {
      channels: Float32Array[]; sampleRate: number;
      task: { kind: "wav" | "range" | "spectrum" | "stereo" | "waveform"; depth: WavDepth; dither: boolean; threshold: number };
    };
    if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2 || !channels.every(channel => channel instanceof Float32Array && channel.length === channels[0].length)
      || channels[0].length < 1 || channels[0].length * channels.length > 64_000_000 || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
      throw Error("Invalid audio worker input");
    const buffer = { numberOfChannels: channels.length, length: channels[0].length, sampleRate,
      duration: channels[0].length / sampleRate, getChannelData: (index: number) => channels[index] } as AudioBuffer;
    if (task.kind === "wav" && ["16", "24", "32f"].includes(task.depth))
      scope.postMessage({ result: encodeWav(buffer, task.depth, task.dither) });
    else if (task.kind === "range" && Number.isFinite(task.threshold))
      scope.postMessage({ result: findActiveRange(buffer, task.threshold) });
    else if (task.kind === "spectrum") scope.postMessage({ result: analyzeSpectrum(buffer) });
    else if (task.kind === "stereo") scope.postMessage({ result: inspectStereo(buffer) });
    else if (task.kind === "waveform") {
      const peaks = new Float32Array(1024);
      for (let bin = 0; bin < peaks.length; bin++) {
        const start = Math.floor(bin / peaks.length * buffer.length), end = Math.floor((bin + 1) / peaks.length * buffer.length);
        for (const channel of channels) for (let index = start; index < end; index++) peaks[bin] = Math.max(peaks[bin], Math.abs(channel[index]));
      }
      scope.postMessage({ result: peaks });
    }
    else throw Error("Unsupported audio worker task");
  } catch { scope.postMessage({ error: "Audio processing failed" }); }
};
