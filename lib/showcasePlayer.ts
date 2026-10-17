import { showcaseTrims, type ShowcaseSide, type ShowcaseTrack } from "./showcaseTracks";

/** Two decoded sources share one clock. A/B changes gains, never media seeks. */
export class ShowcasePlayer {
  private ctx: AudioContext | null = null;
  private gains: Record<ShowcaseSide, GainNode> | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private buffers: AudioBuffer[] | null = null;
  private pending: Promise<AudioBuffer[]> | null = null;
  private abort = new AbortController();
  private generation = 0;
  private destroyed = false;
  private position = 0;
  private startedAt = 0;
  private running = false;
  private side: ShowcaseSide = "original";
  private matched = false;
  private listener: (state: { playing: boolean; loading: boolean }) => void = () => {};
  analyser: AnalyserNode | null = null;
  constructor(readonly track: ShowcaseTrack) {}
  onState(listener: typeof this.listener) { this.listener = listener; }
  get playing() { return this.running; }
  get currentTime() { return this.running && this.ctx ? Math.min(this.duration, this.position + Math.max(0, this.ctx.currentTime - this.startedAt)) : this.position; }
  get duration() { return this.buffers ? Math.min(this.track.duration, ...this.buffers.map(b => b.duration)) : this.track.duration; }
  private context() {
    if (!this.ctx) {
      const ctx = this.ctx = new AudioContext({ sampleRate: 48000, latencyHint: "balanced" });
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = .8;
      this.gains = { original: ctx.createGain(), master: ctx.createGain() };
      this.gains.original.connect(this.analyser); this.gains.master.connect(this.analyser); this.analyser.connect(ctx.destination);
      this.applyGains(true);
    }
    return this.ctx;
  }
  private async load() {
    if (this.buffers) return this.buffers;
    if (this.pending) return this.pending;
    const ctx = this.context();
    this.pending = Promise.all((["original", "master"] as const).map(async side => {
      const response = await fetch(this.track[side].url, { signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(30000)]), cache: "force-cache" });
      if (!response.ok) throw Error("Preview unavailable");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 2000000) throw Error("Preview too large");
      const buffer = await ctx.decodeAudioData(bytes);
      if (buffer.numberOfChannels > 2 || buffer.duration > 25 || buffer.duration < 1 || this.destroyed) throw Error("Invalid preview");
      return buffer;
    }));
    try { this.buffers = await this.pending; return this.buffers; }
    finally { this.pending = null; }
  }
  async play() {
    if (this.running || this.destroyed) return;
    const generation = ++this.generation, ctx = this.context();
    const resumed = ctx.resume(); // synchronous user activation, before fetch/decode
    this.listener({ playing: false, loading: true });
    try {
      const [buffers] = await Promise.all([this.load(), resumed]);
      if (generation !== this.generation || this.destroyed) return;
      if (this.position >= this.duration - .02) this.position = 0;
      const when = ctx.currentTime + .025;
      this.startedAt = when; this.running = true; this.applyGains(true);
      this.sources = buffers.map((buffer, index) => {
        const source = ctx.createBufferSource(); source.buffer = buffer;
        source.connect(this.gains![index === 0 ? "original" : "master"]);
        source.start(when, this.position, this.duration - this.position);
        return source;
      });
      this.sources[0].onended = () => {
        if (generation !== this.generation || !this.running) return;
        this.pause(); this.position = this.duration;
      };
      this.listener({ playing: true, loading: false });
    } catch (error) {
      if (generation !== this.generation || this.destroyed) return;
      this.pause(); throw error;
    }
  }
  pause() {
    this.position = this.currentTime; this.running = false; this.generation++;
    for (const source of this.sources) { source.onended = null; try { source.stop(); } catch { /* already ended */ } source.disconnect(); }
    this.sources = []; this.listener({ playing: false, loading: false });
    if (this.ctx?.state !== "closed") void this.ctx?.suspend().catch(() => {});
  }
  select(side: ShowcaseSide) { this.side = side; this.applyGains(); }
  setMatched(matched: boolean) { this.matched = matched; this.applyGains(); }
  private applyGains(immediate = false) {
    if (!this.ctx || !this.gains) return;
    const now = this.ctx.currentTime, trims = showcaseTrims(this.track, this.matched);
    for (const side of ["original", "master"] as const) {
      const gain = this.gains[side].gain, value = side === this.side ? 10 ** (trims[side] / 20) : 0;
      gain.cancelScheduledValues(now);
      if (immediate) gain.setValueAtTime(value, now);
      else gain.setTargetAtTime(value, now, .008);
    }
  }
  async seek(position: number) {
    const wasRunning = this.running;
    this.pause(); this.position = Math.max(0, Math.min(this.duration, Number.isFinite(position) ? position : 0));
    if (wasRunning && this.position < this.duration - .02) await this.play();
  }
  destroy() {
    this.listener = () => {}; this.destroyed = true; this.pause(); this.abort.abort(); this.buffers = null;
    this.gains?.original.disconnect(); this.gains?.master.disconnect(); this.analyser?.disconnect();
    if (this.ctx && this.ctx.state !== "closed") void this.ctx.close().catch(() => {});
  }
}
