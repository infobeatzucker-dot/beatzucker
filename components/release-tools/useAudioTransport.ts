"use client";

import { useEffect, useRef, useState } from "react";

export type AuditionTrack = { buffer: AudioBuffer; gain?: number; offset?: number };

export function useAudioTransport(tracks: AuditionTrack[], duration: number) {
  const context = useRef<AudioContext | undefined>(undefined);
  const current = useRef<{ sources: AudioBufferSourceNode[]; gains: GainNode[]; start: number; position: number; loop: boolean } | undefined>(undefined);
  const epoch = useRef(0);
  const active = useRef(0);
  const cursor = useRef(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);

  function tickPosition() {
    const graph = current.current;
    if (!graph || !context.current) return cursor.current;
    const elapsed = Math.max(0, context.current.currentTime - graph.start) + graph.position;
    return graph.loop && duration > 0 ? elapsed % duration : Math.min(duration, elapsed);
  }

  function stop(reset = false) {
    epoch.current++;
    cursor.current = reset ? 0 : tickPosition();
    const graph = current.current;
    current.current = undefined;
    for (const node of graph?.sources ?? []) { node.onended = null; node.stop(); node.disconnect(); }
    for (const gain of graph?.gains ?? []) gain.disconnect();
    setPosition(cursor.current);
    setPlaying(false);
  }

  async function play(loop = false, from = cursor.current) {
    if (!tracks.length || duration <= 0) return;
    stop();
    const ticket = epoch.current;
    const ctx = context.current ??= new AudioContext();
    await ctx.resume();
    if (ticket !== epoch.current) return;
    const start = ctx.currentTime + .015;
    const position = Math.min(from, duration - .001);
    const sources: AudioBufferSourceNode[] = [], gains: GainNode[] = [];
    tracks.forEach(({buffer, gain = 1, offset = 0}, index) => {
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      const volume = ctx.createGain();
      volume.gain.value = index === active.current ? gain : 0;
      node.connect(volume).connect(ctx.destination);
      if (loop) {
        node.loop = true; node.loopStart = offset; node.loopEnd = offset + duration;
        node.start(start, offset + position);
      } else node.start(start, offset + position, duration - position);
      sources.push(node);
      gains.push(volume);
    });
    current.current = { sources, gains, start, position, loop };
    sources[0].onended = () => { if (current.current?.sources === sources) stop(true); };
    setPosition(position); setPlaying(true);
  }
  function seek(value: number) {
    cursor.current = value;
    setPosition(value);
    const graph = current.current;
    return graph ? play(graph.loop, value) : Promise.resolve();
  }

  function select(index: number) {
    active.current = index;
    current.current?.gains.forEach((gain, i) => {
      const now = gain.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(i === index ? tracks[i]?.gain ?? 1 : 0, now, .006);
    });
  }

  useEffect(() => {
    stop(true); active.current = 0;
    return () => { stop(true); const ctx = context.current; context.current = undefined; if (ctx) void ctx.close(); };
    // Tracks and duration are the identity of this audition session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, duration]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setPosition(tickPosition()), 60);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  return { position, playing, play, stop, seek, select };
}
