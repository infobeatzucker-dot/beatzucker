"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types/mastering";
import { startVisibleAnimation } from "@/lib/visibleAnimation";

const slots = 64;
const x = (index: number) => (index + .5) / slots * 640;
const y = (peak: number) => 78 - ((Math.min(0, Math.max(-48, 20 * Math.log10(Math.max(peak, 1e-6)))) + 48) / 48) * 68;

export default function ManualRenderComparison({ blob, analyser, playing, start, end, playhead, lang }:
  { blob?: Blob; analyser: AnalyserNode | null; playing: boolean; start: number; end: number; playhead: () => number; lang: Lang }) {
  const frame = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState<number[]>([]);
  const [render, setRender] = useState<number[]>([]);
  const en = lang === "en";

  useEffect(() => {
    if (!analyser || !playing || !frame.current || end <= start) return;
    const waveform = new Float32Array(analyser.fftSize);
    const panel = frame.current.closest('[role="dialog"]') ?? frame.current;
    const loop = startVisibleAnimation(panel, () => {
      const position = playhead();
      if (position < start || position >= end) return;
      const slot = Math.min(slots - 1, Math.floor((position - start) / (end - start) * slots));
      analyser.getFloatTimeDomainData(waveform);
      let peak = 0;
      for (const sample of waveform) peak = Math.max(peak, Math.abs(sample));
      setLive(previous => {
        if ((previous[slot] ?? -1) >= peak) return previous;
        const next = previous.slice();
        next[slot] = peak;
        return next;
      });
    }, { maxFps: 30 });
    return () => loop.stop();
  }, [analyser, playing, start, end, playhead]);

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    let context: AudioContext | undefined;
    setRender([]);
    void (async () => {
      try {
        const bytes = await blob.arrayBuffer();
        if (cancelled) return;
        context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes);
        if (cancelled) return;
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
        const peaks = Array.from({ length: slots }, () => 0);
        for (let i = 0; i < buffer.length; i++) {
          let sample = 0;
          for (const data of channels) sample += data[i] / channels.length;
          const slot = Math.floor(i * slots / buffer.length);
          peaks[slot] = Math.max(peaks[slot], Math.abs(sample));
        }
        setRender(peaks);
      } catch {
        // Playback remains available when graph decoding is unavailable.
      } finally {
        if (context && context.state !== "closed") await context.close().catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [blob]);

  function trace(values: number[]) {
    let previous = -2;
    return values.map((value, index) => {
      const command = index === previous + 1 ? "L" : "M";
      previous = index;
      return `${command}${x(index)} ${y(value)}`;
    }).join(" ");
  }

  return <section className="bz-signal-card bz-manual-compare">
    <header><h3>{en ? "Live vs. control render" : "Live-Vorschau und Kontrollrender"}</h3></header>
    <div className="bz-signal-legend"><span data-signal="A"><i/>{en ? "Live preview" : "Live-Vorschau"}</span><span data-signal="B"><i/>{en ? "Server render" : "Server-Render"}</span></div>
    <svg ref={frame} viewBox="0 0 640 84" preserveAspectRatio="none" role="img" aria-label={en ? "Measured mono peak envelope for the selected section" : "Gemessener Mono-Spitzenpegelverlauf des ausgewählten Ausschnitts"}>
      {[10, 27, 44, 61, 78].map(tick => <line key={tick} x1="0" x2="640" y1={tick} y2={tick} className="bz-signal-grid"/>)}
      <path d={trace(render)} className="bz-trace-b"/>
      <path d={trace(live)} className="bz-trace-a"/>
      {live.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="1.8" className="bz-band-a"/>)}
    </svg>
    <p>{en ? "Mono sample peaks · −48 to 0 dBFS. Play the live loop to capture its trace; render the section to add the server trace." : "Mono-Spitzenpegel · −48 bis 0 dBFS. Spiel den Live-Loop für die erste Kurve und rendere den Ausschnitt für die Server-Kurve."}</p>
  </section>;
}
