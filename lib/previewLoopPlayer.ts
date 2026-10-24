import { normalizeLoopRegion } from "./manualLoop";

/** A bounded decoded loop, not a media-element seek on every repetition. */
export class PreviewLoopPlayer {
  private source: AudioBufferSourceNode | null = null;
  private cache = new Map<string, AudioBuffer>();
  private abort: AbortController | null = null;
  private pending: { key: string; promise: Promise<AudioBuffer> } | null = null;
  private start = 0;
  private end = 8;
  private startedAt = 0;
  private wanted = false;
  private generation = 0;
  private destroyed = false;
  private stateListener: (playing: boolean) => void = () => {};
  private loadingListener: (loading: boolean) => void = () => {};
  private errorListener: () => void = () => {};
  private scheduleListener: (start:number,end:number,contextStart:number)=>void = () => {};
  constructor(private ctx: AudioContext, private destination: AudioNode, private url: string, private fullDuration: number) {}
  onState(fn: (playing: boolean) => void) { this.stateListener = fn; }
  onLoading(fn: (loading: boolean) => void) { this.loadingListener = fn; }
  onError(fn: () => void) { this.errorListener = fn; }
  onSchedule(fn:(start:number,end:number,contextStart:number)=>void){this.scheduleListener=fn;}
  get paused() { return !this.wanted; }
  get duration() { return this.fullDuration; }
  get currentTime() { return this.source ? this.start + (Math.max(0, this.ctx.currentTime - this.startedAt) % (this.end - this.start)) : this.start; }
  private region(start: number, end: number) {
    const region = normalizeLoopRegion(this.fullDuration || Math.max(1, end), start, end - start);
    return { start: region.start, end: region.start + region.len };
  }
  async prepare(start = this.start, end = this.end): Promise<AudioBuffer> {
    const region = this.region(start, end), key = `${region.start.toFixed(3)}:${region.end.toFixed(3)}`;
    const cached = this.cache.get(key); if (cached) return cached;
    if (this.pending?.key === key) return this.pending.promise;
    this.abort?.abort(); const abort = new AbortController(); this.abort = abort;
    this.loadingListener(true);
    const promise = (async () => {
      const query = new URL(this.url, "https://beatzucker.de").searchParams;
      const response = await fetch("/api/preview-section", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.any([abort.signal, AbortSignal.timeout(25000)]),
        body: JSON.stringify({ file_id: query.get("file_id"), upload_token: query.get("upload_token"), start: region.start, end: region.end }),
      });
      if (!response.ok) throw Error("Preview source unavailable");
      const bytes = await response.arrayBuffer(); if (bytes.byteLength > 8000000) throw Error("Preview source too large");
      const buffer = await this.ctx.decodeAudioData(bytes);
      if (abort.signal.aborted || this.destroyed) throw new DOMException("Cancelled", "AbortError");
      if (buffer.numberOfChannels > 2 || buffer.duration > 20.1 || !buffer.length) throw Error("Invalid preview source");
      // A tiny audition-only taper avoids a click at arbitrary loop boundaries.
      const fade = Math.min(Math.round(buffer.sampleRate * .003), Math.floor(buffer.length / 2));
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < fade; i++) { const gain = i / Math.max(1, fade - 1); data[i] *= gain; data[data.length - 1 - i] *= gain; }
      }
      this.cache.set(key, buffer); while (this.cache.size > 2) this.cache.delete(this.cache.keys().next().value!);
      return buffer;
    })();
    this.pending = { key, promise };
    try { return await promise; }
    finally { if (this.abort === abort) { this.pending = null; this.loadingListener(false); } }
  }
  setRegion(start: number, end: number) {
    const region = this.region(start, end);
    if (Math.abs(region.start - this.start) < .001 && Math.abs(region.end - this.end) < .001) return;
    const restart = this.wanted;
    this.stopSource(); this.start = region.start; this.end = region.end;
    this.generation++;
    if (restart) void this.play().catch(() => { if (!this.destroyed) { this.pause(); this.errorListener(); } });
    else void this.prepare().catch(() => {});
  }
  private async play() {
    const generation = ++this.generation;
    this.wanted = true;
    let buffer: AudioBuffer;
    try { buffer = await this.prepare(); }
    catch (error) { if (generation !== this.generation || this.destroyed) return; throw error; }
    if (!this.wanted || this.destroyed || generation !== this.generation) return;
    const source = this.ctx.createBufferSource(); source.buffer = buffer; source.loop = true; source.loopStart = 0; source.loopEnd = buffer.duration;
    source.connect(this.destination); this.source = source; this.startedAt = this.ctx.currentTime;
    this.scheduleListener(this.start,this.start+buffer.duration,this.startedAt);
    source.start(); this.stateListener(true);
  }
  async toggle(start: number, end: number) {
    if (this.wanted) { this.pause(); return; }
    const resumed = this.ctx.resume(); // called in the user gesture, before fetch/decode
    const region = this.region(start, end); this.start = region.start; this.end = region.end;
    await resumed;
    try { await this.play(); } catch (error) { this.pause(); throw error; }
  }
  private stopSource() { if (this.source) { this.source.stop(); this.source.disconnect(); this.source = null; } this.stateListener(false); }
  pause() { this.generation++; this.wanted = false; this.stopSource(); void this.ctx.suspend().catch(() => {}); }
  destroy() { this.destroyed = true; this.pause(); this.abort?.abort(); this.cache.clear(); }
}
