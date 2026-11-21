import { dbGain, frequencies, inspect, type Settings } from "./settings";

function filtersFor(context: BaseAudioContext) {
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 0;
  highpass.Q.value = .707;
  return [...frequencies.map((frequency, index) => {
    const filter = context.createBiquadFilter();
    filter.type = index === 0 ? "lowshelf" : index === 3 ? "highshelf" : "peaking";
    filter.frequency.value = frequency;
    filter.Q.value = .85;
    return filter;
  }), highpass];
}

function workletSettings(settings: Settings) {
  const active = settings.active;
  return {
    dynamics: active.dynamics, limiter: active.limiter,
    width: active.stereo ? settings.width / 100 : 1,
    monoBass: active.stereo ? settings.monoBass / 100 : 0,
    saturation: active.saturation ? settings.saturation / 100 : 0,
    deessAmount: active.deesser ? settings.deessAmount / 100 : 0,
    deessFrequency: settings.deessFrequency, deessThreshold: settings.deessThreshold,
    duckDepth: active.ducking ? settings.duckDepth : 0,
    duckFrequency: settings.duckFrequency, duckThreshold: settings.duckThreshold, duckRelease: settings.duckRelease,
    finalAir: active.finalEq ? settings.finalAir : 0, finalFrequency: settings.finalFrequency,
    busThreshold: settings.busThreshold, busRatio: active.bus ? settings.busRatio : 1,
    bands: settings.bands, drive: settings.drive, ceiling: settings.ceiling, release: settings.release,
  };
}

function configure(context: BaseAudioContext, trim: GainNode, filters: BiquadFilterNode[], settings: Settings, smooth: boolean) {
  const write = (param: AudioParam, value: number) => {
    if (smooth) param.setTargetAtTime(value, context.currentTime, .01);
    else param.value = value;
  };
  write(trim.gain, settings.active.input ? dbGain(settings.trim) : 1);
  filters.forEach((filter, index) => {
    if (filter.type === "highpass") {
      write(filter.frequency, settings.active.eq ? settings.highpass : 0);
      return;
    }
    write(filter.gain, settings.active.eq ? settings.eq[index] : 0);
    write(filter.frequency, Math.min(settings.eqFrequency[index], context.sampleRate * .49));
    write(filter.Q, settings.eqQ[index]);
  });
}

const processorName = "mastering-lab-preview";
const scriptPath = "/audio/mastering-lab-preview.js?v=2";
const stereo = { outputChannelCount: [2], channelCount: 2, channelCountMode: "explicit" } as const;

async function render(buffer: AudioBuffer, settings: Settings) {
  const context = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);
  await context.audioWorklet.addModule(scriptPath);
  const trim = context.createGain();
  const filters = filtersFor(context);
  const processor = new AudioWorkletNode(context, processorName, {
    ...stereo, outputChannelCount: [2], processorOptions: { settings: workletSettings(settings), meters: false },
  });
  configure(context, trim, filters, settings, false);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const chain = [source, trim, filters[4], ...filters.slice(0, 4), processor, context.destination];
  chain.slice(0, -1).forEach((node, index) => node.connect(chain[index + 1]));
  source.start();
  try {
    return await context.startRendering();
  } finally {
    processor.port.close();
  }
}

let offlineTask = Promise.resolve();

export function renderLabBuffer(buffer: AudioBuffer, settings: Settings) {
  const job = offlineTask.then(() => render(buffer, settings));
  offlineTask = job.then(() => {}, () => {});
  return job;
}

export async function renderComparison(buffer: AudioBuffer, settings: Settings) {
  return inspect(await renderLabBuffer(buffer, settings), false);
}

export class LabAudio {
  readonly context = new AudioContext();
  readonly input = this.context.createAnalyser();
  readonly output = this.context.createAnalyser();
  readonly trim = this.context.createGain();
  readonly filters = filtersFor(this.context);
  readonly dryMonitor = this.context.createGain();
  readonly wetMonitor = this.context.createGain();
  readonly ready = this.connect();
  reduction = { bands: [1, 1, 1, 1], limit: 1, bus: 1, correlation: 0, deesser: 1, ducking: 1 };
  private processor?: AudioWorkletNode;
  private source?: AudioBufferSourceNode;
  private offset = 0;
  private started = 0;
  private region?: [number, number];
  buffer?: AudioBuffer;
  finished?: () => void;

  private async connect() {
    await this.context.audioWorklet.addModule(scriptPath);
    const processor = new AudioWorkletNode(this.context, processorName, { ...stereo, outputChannelCount: [2] });
    this.processor = processor;
    processor.port.onmessage = ({ data }) => { this.reduction = data; };
    this.dryMonitor.gain.value = 0;
    this.input.connect(this.dryMonitor).connect(this.context.destination);
    const chain = [this.input, this.trim, this.filters[4], ...this.filters.slice(0, 4), processor, this.output, this.wetMonitor, this.context.destination];
    chain.slice(0, -1).forEach((node, index) => node.connect(chain[index + 1]));
    this.output.fftSize = 2048;
    this.input.fftSize = this.output.fftSize;
  }

  update(settings: Settings, auditionOriginal: boolean, matchDb = 0) {
    configure(this.context, this.trim, this.filters, settings, true);
    this.processor?.port.postMessage(workletSettings(settings));
    const now = this.context.currentTime;
    this.dryMonitor.gain.setTargetAtTime(auditionOriginal ? dbGain(Math.min(0, -matchDb)) : 0, now, .012);
    this.wetMonitor.gain.setTargetAtTime(auditionOriginal ? 0 : dbGain(Math.min(0, matchDb)), now, .012);
  }

  get time() {
    if (!this.source) return this.offset;
    const elapsed = this.offset + this.context.currentTime - this.started;
    if (this.region && elapsed >= this.region[1]) {
      const [start, end] = this.region;
      return start + (elapsed - start) % (end - start);
    }
    return Math.min(elapsed, this.buffer?.duration ?? elapsed);
  }

  start(position: number, region?: [number, number]) {
    const buffer = this.buffer;
    if (!buffer) return;
    this.stop();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    this.region = region;
    this.offset = Math.max(0, Math.min(position, buffer.duration - .001));
    if (region) {
      [source.loopStart, source.loopEnd] = region;
      source.loop = true;
      if (this.offset >= region[1] || this.offset < region[0]) this.offset = region[0];
    }
    source.connect(this.input);
    source.onended = () => {
      if (this.source !== source) return;
      source.disconnect();
      this.source = undefined;
      this.offset = 0;
      this.finished?.();
    };
    this.started = this.context.currentTime;
    source.start(0, this.offset);
    this.source = source;
  }

  stop() {
    const offset = this.time;
    if (this.source) {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = undefined;
    }
    this.offset = offset;
  }

  reset() {
    this.stop();
    this.offset = 0;
  }

  close() {
    this.stop();
    this.processor?.port.close();
    void this.context.close();
  }
}
