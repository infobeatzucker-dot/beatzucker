import type { ParamValues } from "@/lib/masteringParams";
import { normalizeLoopRegion } from "./manualLoop";

/**
 * Lokale, latenzarme Näherung der Python-Mastering-Kette.
 * Der endgültige Export bleibt bewusst beim serverseitigen DSP; diese Engine
 * soll Reglerbewegungen sofort hörbar machen und erzeugt keinerlei Renderjobs.
 */
export class ManualPreviewEngine {
  readonly analyser: AnalyserNode;
  readonly ready: Promise<void>;

  private readonly ctx: AudioContext;
  private readonly audio: HTMLAudioElement;
  private readonly source: MediaElementAudioSourceNode;
  private readonly input: GainNode;
  private readonly eq: Record<"hp" | "low" | "mid" | "presence" | "air", BiquadFilterNode>;
  private readonly shaper: WaveShaperNode;
  private bands: AudioWorkletNode | null = null;
  private bus: AudioWorkletNode | null = null;
  private reduction = 0;
  private latestValues: ParamValues;
  private readonly contextParams: Record<string, unknown>;
  private readonly finalAir: BiquadFilterNode;
  private readonly saturationWet: GainNode;
  private readonly saturationDry: GainNode;
  private readonly wet: GainNode;
  private readonly dry: GainNode;
  private readonly output: GainNode;
  private loopStart = 0;
  private loopEnd = 8;
  private raf = 0;
  private destroyed = false;
  private looping = false;
  private stateListener: ((playing: boolean) => void) | null = null;

  constructor(url: string, values: ParamValues, inputLufs = -18, inputTruePeak = -6, contextParams: Record<string, unknown> = {}) {
    this.latestValues = values; this.contextParams = contextParams;
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    this.audio = new Audio(url);
    this.audio.preload = "auto";
    this.audio.crossOrigin = "anonymous";
    this.source = this.ctx.createMediaElementSource(this.audio);
    this.input = this.ctx.createGain();
    const requestedGainDb = Math.max(-24, Math.min(24, -18 - inputLufs));
    const peakSafeGainDb = -0.18 - inputTruePeak;
    this.input.gain.value = Math.pow(10, Math.min(requestedGainDb, peakSafeGainDb) / 20);

    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.Q.value = 0.707;
    const low = this.ctx.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 80;
    const mid = this.ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = Number(contextParams.mid_notch_freq ?? 280); mid.Q.value = Number(contextParams.mid_notch_q ?? 2);
    const presence = this.ctx.createBiquadFilter(); presence.type = "peaking"; presence.frequency.value = Number(contextParams.presence_freq ?? 3000); presence.Q.value = 1.2;
    const air = this.ctx.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 12000;
    this.eq = { hp, low, mid, presence, air };
    this.source.connect(this.input).connect(hp).connect(low).connect(mid).connect(presence).connect(air);

    this.shaper = this.ctx.createWaveShaper();
    this.shaper.oversample = "2x";
    this.finalAir = this.ctx.createBiquadFilter(); this.finalAir.type = "highshelf";
    this.finalAir.frequency.value = Math.min(12000, this.ctx.sampleRate * .45);
    this.finalAir.gain.value = Number(contextParams.final_air_gain ?? 0);
    this.wet = this.ctx.createGain(); this.dry = this.ctx.createGain();

    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = Number(contextParams.true_peak_ceiling ?? -1);
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;
    this.input.connect(this.dry).connect(limiter);
    this.wet.connect(limiter);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.76;
    this.output = this.ctx.createGain();
    this.output.gain.value = 1;

    // Saturation mirrors the server's complementary 5 kHz split: only the
    // lower branch is shaped; highs remain clean and recombine afterwards.
    const satLow1 = this.ctx.createBiquadFilter(); satLow1.type = "lowpass"; satLow1.frequency.value = 5000; satLow1.Q.value = 0.707;
    const satLow2 = this.ctx.createBiquadFilter(); satLow2.type = "lowpass"; satLow2.frequency.value = 5000; satLow2.Q.value = 0.707;
    const satHigh1 = this.ctx.createBiquadFilter(); satHigh1.type = "highpass"; satHigh1.frequency.value = 5000; satHigh1.Q.value = 0.707;
    const satHigh2 = this.ctx.createBiquadFilter(); satHigh2.type = "highpass"; satHigh2.frequency.value = 5000; satHigh2.Q.value = 0.707;
    const satSum = this.ctx.createGain();
    this.saturationWet = this.ctx.createGain(); this.saturationDry = this.ctx.createGain();
    satLow1.connect(satLow2).connect(this.shaper).connect(satSum);
    satHigh1.connect(satHigh2).connect(satSum);
    satSum.connect(this.saturationWet).connect(this.finalAir);
    this.saturationDry.connect(this.finalAir);
    limiter.connect(this.analyser).connect(this.output).connect(this.ctx.destination);

    this.ready = Promise.resolve().then(async () => {
      if (!this.ctx.audioWorklet) throw Error("AudioWorklet is required for live preview");
      await this.ctx.audioWorklet.addModule("/audio/mastering-dynamics.js?v=0.14.0");
      if (this.destroyed) return;
      const params = { ...this.contextParams, ...this.latestValues };
      this.bands = new AudioWorkletNode(this.ctx, "beatzucker-mastering-dynamics", { outputChannelCount: [2], processorOptions: { mode: "bands", params } });
      this.bus = new AudioWorkletNode(this.ctx, "beatzucker-mastering-dynamics", { outputChannelCount: [2], processorOptions: { mode: "bus", params } });
      this.bus.port.onmessage = event => { if (Number.isFinite(event.data?.reduction)) this.reduction = event.data.reduction; };
      air.connect(this.bands); this.bands.connect(satLow1); this.bands.connect(satHigh1);
      this.bands.connect(this.saturationDry);
      this.finalAir.connect(this.bus).connect(this.wet);
    });
    // Handle load rejection even if the user closes before pressing Play.
    void this.ready.catch(() => {});

    this.audio.addEventListener("play", this.handlePlay);
    this.audio.addEventListener("pause", this.handlePause);
    this.audio.addEventListener("ended", this.handleEnded);
    this.audio.addEventListener("loadedmetadata", this.handleMetadata);
    this.update(values, true);
    this.tick();
  }

  private handlePlay = () => this.stateListener?.(true);
  private handlePause = () => this.stateListener?.(false);
  private handleMetadata = () => this.setRegion(this.loopStart, this.loopEnd);
  private handleEnded = () => {
    // RAF can be throttled in a hidden tab or miss the final samples. Restart
    // at EOF as well, including loops whose end is exactly the file duration.
    if (!this.looping || this.destroyed) return;
    this.audio.currentTime = this.loopStart;
    void this.audio.play().catch(() => { this.looping = false; this.stateListener?.(false); });
  };

  private tick = () => {
    if (this.destroyed) return;
    if (!this.audio.paused && this.audio.currentTime >= this.loopEnd - 0.025) {
      this.audio.currentTime = this.loopStart;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  onState(listener: (playing: boolean) => void) {
    this.stateListener = listener;
  }

  get currentTime() { return this.audio.currentTime || 0; }
  get duration() { return Number.isFinite(this.audio.duration) ? this.audio.duration : 0; }
  get paused() { return this.audio.paused; }
  get busReduction() { return this.reduction; }

  setRegion(start: number, end: number) {
    const duration = this.duration || Math.max(1, Number.isFinite(end) ? end : 8);
    const region = normalizeLoopRegion(duration, start, end - start);
    this.loopStart = region.start;
    this.loopEnd = region.start + region.len;
    if (this.audio.currentTime < this.loopStart || this.audio.currentTime >= this.loopEnd) {
      this.audio.currentTime = this.loopStart;
    }
  }

  async toggle(start: number, end: number) {
    await this.ready;
    if (this.destroyed) return;
    this.setRegion(start, end);
    if (!this.audio.paused) {
      this.looping = false;
      this.audio.pause();
      return;
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.audio.currentTime = this.loopStart;
    this.looping = true;
    try { await this.audio.play(); }
    catch (error) { this.looping = false; throw error; }
  }

  pause() { this.looping = false; this.audio.pause(); }

  update(values: ParamValues, immediate = false) {
    const now = this.ctx.currentTime;
    const set = (param: AudioParam, value: number) => {
      param.cancelScheduledValues(now);
      if (immediate) param.setValueAtTime(value, now);
      else param.setTargetAtTime(value, now, 0.025);
    };

    set(this.eq.hp.frequency, values.highpass_freq ?? 30);
    set(this.eq.low.gain, values.low_shelf_gain ?? 0);
    set(this.eq.mid.gain, values.mid_notch_gain ?? 0);
    set(this.eq.presence.gain, values.presence_gain ?? 0);
    set(this.eq.air.gain, values.air_gain ?? 0);

    this.latestValues = values;
    const active = Number(this.contextParams.processing_intensity ?? 65) > 0 || Object.entries(values).some(([key, value]) => typeof this.contextParams[key] === "number" && Math.abs(Number(value) - Number(this.contextParams[key])) > 1e-6);
    set(this.wet.gain, active ? 1 : 0); set(this.dry.gain, active ? 0 : 1);
    const params = { ...this.contextParams, ...values };
    this.bands?.port.postMessage({ params }); this.bus?.port.postMessage({ params });

    const drive = values.saturation_amount ?? 0;
    this.shaper.curve = this.makeSaturationCurve(drive);
    set(this.saturationWet.gain, drive >= .01 ? 1 : 0); set(this.saturationDry.gain, drive >= .01 ? 0 : 1);
  }

  private makeSaturationCurve(amount: number) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    if (amount <= 0.0001) {
      for (let i = 0; i < samples; i++) curve[i] = (i / (samples - 1)) * 2 - 1;
      return curve;
    }
    // Same transfer curve as python/mastering.py: tanh(x*k)/k, k=1+2a.
    const drive = 1 + Math.max(0, amount) * 2;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * drive) / drive;
    }
    return curve;
  }

  destroy() {
    this.destroyed = true;
    this.looping = false;
    cancelAnimationFrame(this.raf);
    this.audio.pause();
    this.audio.removeEventListener("play", this.handlePlay);
    this.audio.removeEventListener("pause", this.handlePause);
    this.audio.removeEventListener("ended", this.handleEnded);
    this.audio.removeEventListener("loadedmetadata", this.handleMetadata);
    this.audio.removeAttribute("src");
    this.audio.load();
    void this.ctx.close();
  }
}
