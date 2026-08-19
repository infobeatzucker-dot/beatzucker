import type { ParamValues } from "@/lib/masteringParams";

type BandName = "sub" | "low" | "mid" | "high";

const BAND_KEYS: Record<BandName, { threshold: keyof ParamValues; ratio: keyof ParamValues }> = {
  sub:  { threshold: "mb_sub_threshold",  ratio: "mb_sub_ratio" },
  low:  { threshold: "mb_low_threshold",  ratio: "mb_low_ratio" },
  mid:  { threshold: "mb_mid_threshold",  ratio: "mb_mid_ratio" },
  high: { threshold: "mb_high_threshold", ratio: "mb_high_ratio" },
};

/**
 * Lokale, latenzarme Näherung der Python-Mastering-Kette.
 * Der endgültige Export bleibt bewusst beim serverseitigen DSP; diese Engine
 * soll Reglerbewegungen sofort hörbar machen und erzeugt keinerlei Renderjobs.
 */
export class ManualPreviewEngine {
  readonly analyser: AnalyserNode;

  private readonly ctx: AudioContext;
  private readonly audio: HTMLAudioElement;
  private readonly source: MediaElementAudioSourceNode;
  private readonly input: GainNode;
  private readonly eq: Record<"hp" | "low" | "mid" | "presence" | "air", BiquadFilterNode>;
  private readonly bandCompressors: Record<BandName, DynamicsCompressorNode>;
  private readonly stereoGains: GainNode[];
  private readonly shaper: WaveShaperNode;
  private readonly bus: DynamicsCompressorNode;
  private readonly output: GainNode;
  private loopStart = 0;
  private loopEnd = 8;
  private raf = 0;
  private destroyed = false;
  private stateListener: ((playing: boolean) => void) | null = null;

  constructor(url: string, values: ParamValues, inputLufs = -18, inputTruePeak = -6) {
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
    const mid = this.ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 280; mid.Q.value = 1.05;
    const presence = this.ctx.createBiquadFilter(); presence.type = "peaking"; presence.frequency.value = 3000; presence.Q.value = 0.8;
    const air = this.ctx.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 12000;
    this.eq = { hp, low, mid, presence, air };
    this.source.connect(this.input).connect(hp).connect(low).connect(mid).connect(presence).connect(air);

    const sum = this.ctx.createGain();
    const createBand = (name: BandName, filters: Array<[BiquadFilterType, number]>) => {
      let previous: AudioNode = air;
      for (const [type, frequency] of filters) {
        // Zwei Filter pro Flanke ergeben eine ruhigere, näherungsweise
        // Linkwitz-Riley-artige Trennung ohne zusätzliches AudioWorklet.
        for (let pass = 0; pass < 2; pass++) {
          const filter = this.ctx.createBiquadFilter();
          filter.type = type;
          filter.frequency.value = frequency;
          filter.Q.value = 0.707;
          previous.connect(filter);
          previous = filter;
        }
      }
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.knee.value = 0;
      compressor.attack.value = name === "high" ? 0.008 : name === "mid" ? 0.015 : 0.03;
      compressor.release.value = name === "sub" ? 0.16 : 0.1;
      previous.connect(compressor).connect(sum);
      return compressor;
    };

    this.bandCompressors = {
      sub: createBand("sub", [["lowpass", 80]]),
      low: createBand("low", [["highpass", 80], ["lowpass", 500]]),
      mid: createBand("mid", [["highpass", 500], ["lowpass", 5000]]),
      high: createBand("high", [["highpass", 5000]]),
    };

    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);
    sum.connect(splitter);
    this.stereoGains = Array.from({ length: 8 }, () => this.ctx.createGain());
    // L' = .5L + .5R + .5wL - .5wR
    // R' = .5L + .5R - .5wL + .5wR
    const inputChannels = [0, 1, 0, 1, 0, 1, 0, 1];
    const outputChannels = [0, 0, 0, 0, 1, 1, 1, 1];
    this.stereoGains.forEach((gain, index) => {
      splitter.connect(gain, inputChannels[index]);
      gain.connect(merger, 0, outputChannels[index]);
    });

    this.shaper = this.ctx.createWaveShaper();
    this.shaper.oversample = "4x";
    this.bus = this.ctx.createDynamicsCompressor();
    this.bus.knee.value = 0;
    this.bus.attack.value = 0.05;
    this.bus.release.value = 0.1;

    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;

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
    merger.connect(satLow1).connect(satLow2).connect(this.shaper).connect(satSum);
    merger.connect(satHigh1).connect(satHigh2).connect(satSum);
    satSum.connect(this.bus).connect(limiter).connect(this.analyser).connect(this.output).connect(this.ctx.destination);

    this.audio.addEventListener("play", this.handlePlay);
    this.audio.addEventListener("pause", this.handlePause);
    this.update(values, true);
    this.tick();
  }

  private handlePlay = () => this.stateListener?.(true);
  private handlePause = () => this.stateListener?.(false);

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
  get busReduction() { return Math.abs(this.bus.reduction || 0); }

  setRegion(start: number, end: number) {
    this.loopStart = Math.max(0, start);
    this.loopEnd = Math.max(this.loopStart + 1, end);
    if (this.audio.currentTime < this.loopStart || this.audio.currentTime >= this.loopEnd) {
      this.audio.currentTime = this.loopStart;
    }
  }

  async toggle(start: number, end: number) {
    this.setRegion(start, end);
    if (!this.audio.paused) {
      this.audio.pause();
      return;
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.audio.currentTime = this.loopStart;
    await this.audio.play();
  }

  pause() { this.audio.pause(); }

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

    (Object.keys(BAND_KEYS) as BandName[]).forEach((name) => {
      const keys = BAND_KEYS[name];
      set(this.bandCompressors[name].threshold, Number(values[keys.threshold] ?? -18));
      set(this.bandCompressors[name].ratio, Number(values[keys.ratio] ?? 2));
    });

    const width = values.stereo_width ?? 1;
    const stereo = [.5 + .5 * width, .5 - .5 * width, 0, 0, .5 - .5 * width, .5 + .5 * width, 0, 0];
    // Die vier nicht benötigten Matrixpfade bleiben auf 0; die ersten beiden
    // pro Ausgang tragen bereits Mid- und Side-Anteil kombiniert.
    stereo.forEach((value, index) => set(this.stereoGains[index].gain, value));

    const drive = values.saturation_amount ?? 0;
    this.shaper.curve = this.makeSaturationCurve(drive);
    set(this.bus.threshold, values.bus_comp_threshold ?? -24);
    set(this.bus.ratio, values.bus_comp_ratio ?? 1.4);
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
    cancelAnimationFrame(this.raf);
    this.audio.pause();
    this.audio.removeEventListener("play", this.handlePlay);
    this.audio.removeEventListener("pause", this.handlePause);
    this.audio.removeAttribute("src");
    this.audio.load();
    void this.ctx.close();
  }
}
