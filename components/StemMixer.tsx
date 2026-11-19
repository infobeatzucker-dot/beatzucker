"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AudioLines, Drum, Guitar, Mic2, Music2, Pause, Play, RotateCcw, Waves } from "lucide-react";
import { stopGlobalAudio } from "@/lib/globalAudio";
import { startVisibleAnimation } from "@/lib/visibleAnimation";
import type { Lang } from "@/lib/types/mastering";
import "./stem-mixer.css";

const frameSize = 1024;
const clock = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
type Strip = { analyser: AnalyserNode; fader: GainNode; trim: GainNode; samples: Float32Array<ArrayBuffer> };
type Graph = { context: AudioContext; output: GainNode; strips: Strip[] };

const names: Record<string, [string, string]> = {
  vocals: ["Stimme", "Vocals"], instrumental: ["Instrumental", "Instrumental"],
  drums: ["Drums", "Drums"], bass: ["Bass", "Bass"], other: ["Übrige", "Other"],
};
const icons = { vocals: Mic2, instrumental: Music2, drums: Drum, bass: Guitar, other: Waves };
const unity = 85;
const scale = [[1, -72], [12, -60], [27, -30], [46, -15], [66, -6], [unity, 0], [100, 6]] as const;

function faderDb(value: number) {
  if (value === 0) return -Infinity;
  for (let i = 1; i < scale.length; i++) {
    const [to, upper] = scale[i];
    if (value <= to) {
      const [from, lower] = scale[i - 1];
      return lower + (value - from) / (to - from) * (upper - lower);
    }
  }
  return 6;
}

type MixerSource = { id: string; demo?: false } | { id?: never; demo: true };
const mixerPlay = "beatzucker-stem-mixer-play";

export default function StemMixer({ id, demo, stems, lang }: MixerSource & { stems: string[]; lang: Lang }) {
  const en = lang === "en";
  const deck = useRef<HTMLDivElement>(null);
  const media = useRef<(HTMLAudioElement | null)[]>([]);
  const waves = useRef<(SVGPathElement | null)[]>([]);
  const meters = useRef<(HTMLElement | null)[]>([]);
  const graph = useRef<Graph | null>(null);
  const attempt = useRef(0);
  const requested = useRef(false);
  const starting = useRef(false);
  const waiting = useRef(false);
  const waitBegan = useRef(0);
  const seekTarget = useRef<number | null>(null);
  const [muted, setMuted] = useState<string[]>([]);
  const [solo, setSolo] = useState<string[]>([]);
  const [faders, setFaders] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState(false);
  const isAudible = useCallback((stem: string) => !muted.includes(stem) && (!solo.length || solo.includes(stem)), [muted, solo]);

  function pauseMedia() {
    for (const audio of media.current) {
      if (!audio) continue;
      audio.pause();
      audio.playbackRate = 1;
    }
  }

  function output(open: boolean) {
    const activeGraph = graph.current;
    if (!activeGraph) return;
    activeGraph.output.gain.setTargetAtTime(open ? 1 : 0, activeGraph.context.currentTime, .008);
  }

  function stop() {
    attempt.current++;
    requested.current = starting.current = waiting.current = false;
    output(false);
    pauseMedia();
    setPlaying(false);
    setLoading(false);
  }

  function fail() {
    stop();
    setError(true);
  }

  function updateDuration() {
    const durations = media.current.map(audio => audio?.duration ?? 0);
    if (durations.length === stems.length && durations.every(value => Number.isFinite(value) && value > 0)) {
      setDuration(Math.min(...durations));
    }
  }

  function jump(to: number) {
    const target = Math.min(duration, Math.max(0, to));
    if (requested.current) {
      attempt.current++;
      starting.current = false;
      pauseMedia();
      output(false);
      waiting.current = true;
      waitBegan.current = performance.now();
      setLoading(true);
    }
    seekTarget.current = target;
    for (const audio of media.current) if (audio && audio.readyState >= 1) audio.currentTime = target;
    setPosition(target);
  }

  const synchronizeGains = useCallback(() => {
    const activeGraph = graph.current;
    if (!activeGraph) return;
    const numberAudible = Math.max(1, stems.filter(isAudible).length);
    const now = activeGraph.context.currentTime;
    activeGraph.strips.forEach(({ fader, trim }, index) => {
      const stem = stems[index];
      fader.gain.setTargetAtTime(isAudible(stem) ? 10 ** (faderDb(faders[stem] ?? unity) / 20) : 0, now, .012);
      trim.gain.setTargetAtTime(.94 / Math.sqrt(numberAudible), now, .012);
    });
  }, [faders, isAudible, stems]);

  useEffect(synchronizeGains, [synchronizeGains]);

  function startMedia(resume?: Promise<void>) {
    const token = ++attempt.current;
    starting.current = true;
    waiting.current = false;
    output(false);
    const plays = media.current.map(audio => audio?.play());
    void Promise.all([resume, ...plays]).then(() => {
      if (token !== attempt.current) return;
      starting.current = false;
      setPlaying(true);
      const positions = media.current.map(audio => audio?.currentTime ?? 0);
      const earliest = Math.min(...positions);
      if (Math.max(...positions) - earliest > .075) {
        pauseMedia();
        waiting.current = true;
        waitBegan.current = performance.now();
        seekTarget.current = earliest;
        for (const audio of media.current) if (audio && Math.abs(audio.currentTime - earliest) > .045) audio.currentTime = earliest;
      } else {
        output(true);
        setLoading(false);
      }
    }, () => {
      if (token === attempt.current) fail();
    });
  }

  function toggle() {
    if (requested.current) { stop(); return; }
    if (media.current.some(audio => !audio || audio.error)) { fail(); return; }
    stopGlobalAudio();
    document.dispatchEvent(new CustomEvent(mixerPlay, { detail: deck.current }));
    setError(false);
    requested.current = true;
    setLoading(true);
    try {
      if (!graph.current) {
        const context = new AudioContext({ latencyHint: "playback" });
        const mix = context.createDynamicsCompressor(), output = context.createGain();
        mix.threshold.value = -2;
        mix.knee.value = 0;
        mix.ratio.value = 12;
        mix.attack.value = .003;
        mix.release.value = .08;
        output.gain.value = 0;
        mix.connect(output).connect(context.destination);
        const strips = media.current.map(audio => {
          const source = context.createMediaElementSource(audio!);
          const analyser = context.createAnalyser(), fader = context.createGain(), trim = context.createGain();
          analyser.fftSize = frameSize;
          fader.gain.value = 0;
          source.connect(fader).connect(analyser).connect(trim).connect(mix);
          return { analyser, fader, trim, samples: new Float32Array(frameSize) };
        });
        graph.current = { context, output, strips };
        synchronizeGains();
      }
      const resume = graph.current.context.resume();
      if (duration && (media.current[0]?.currentTime ?? 0) >= duration - .025) {
        for (const audio of media.current) if (audio) audio.currentTime = 0;
        seekTarget.current = 0;
        setPosition(0);
      }
      startMedia(resume);
    } catch {
      if (requested.current) fail();
    }
  }

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const players = media.current;
      const main = players[0];
      if (!main || !requested.current || starting.current) return;
      if (players.some(audio => audio?.ended)) { stop(); setPosition(duration); return; }
      if (waiting.current) {
        if (performance.now() - waitBegan.current > 15000) { fail(); return; }
        if (players.every(audio => audio && !audio.seeking && audio.readyState >= 3)) {
          const target = seekTarget.current ?? main.currentTime;
          for (const player of players) if (player && Math.abs(player.currentTime - target) > .05) player.currentTime = target;
          seekTarget.current = null;
          startMedia();
        }
        return;
      }
      if (players.some(audio => !audio || audio.seeking || audio.readyState < 3)) {
        pauseMedia();
        output(false);
        waiting.current = true;
        waitBegan.current = performance.now();
        setLoading(true);
        return;
      }
      seekTarget.current = null;
      setPosition(main.currentTime);
      for (const player of players.slice(1)) {
        if (!player) continue;
        const drift = main.currentTime - player.currentTime;
        if (Math.abs(drift) > .18) player.currentTime = main.currentTime;
        player.playbackRate = Math.abs(drift) <= .025 ? 1 : 1 + Math.max(-.04, Math.min(.04, drift * .35));
      }
    }, 100);
    return () => clearInterval(timer);
    // Media refs own the transport; only playback and duration restart the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  useEffect(() => {
    if (!deck.current || !playing) return;
    const loop = startVisibleAnimation(deck.current, () => {
      graph.current?.strips.forEach(({ analyser, samples }, index) => {
        analyser.getFloatTimeDomainData(samples);
        let peak = 0;
        for (const value of samples) peak = Math.max(peak, Math.abs(value));
        const level = Math.max(0, Math.min(1, (20 * Math.log10(Math.max(1e-6, peak)) + 54) / 54));
        meters.current[index]?.style.setProperty("--level", String(Math.floor(level * 18) / 18));
        const points = [];
        for (let i = 0; i < 128; i++) points.push(`${i * 4} ${24 - 20 * Math.max(-1, Math.min(1, samples[i * 8]))}`);
        waves.current[index]?.setAttribute("d", `M${points.join(" L")}`);
      });
    }, { maxFps: 24 });
    return () => {
      loop.stop();
      for (const path of waves.current) path?.setAttribute("d", "M0 24H508");
      for (const meter of meters.current) meter?.style.setProperty("--level", "0");
    };
  }, [playing]);

  useEffect(() => {
    const players = [...media.current];
    const element = deck.current;
    function pauseOther(event: Event) {
      if ((event as CustomEvent).detail !== element && requested.current) stop();
    }
    document.addEventListener(mixerPlay, pauseOther);
    return () => {
      document.removeEventListener(mixerPlay, pauseOther);
      attempt.current++;
      requested.current = starting.current = waiting.current = false;
      for (const player of players) player?.pause();
      const current = graph.current;
      graph.current = null;
      if (current) void current.context.close().catch(() => {});
    };
  }, []);

  function toggleStrip(list: string[], code: string, update: (value: string[]) => void) {
    update(list.includes(code) ? list.filter(name => name !== code) : [...list, code]);
  }

  return <div ref={deck} className="bz-stem-mixer">
    <header className="bz-desk-header">
      <h2><AudioLines size={20}/>{demo ? (en ? "Demo mixer" : "Demo-Mischpult") : en ? "Stem mixer" : "Spurenmixer"}</h2>
      <span className="bz-desk-led" data-playing={playing && !loading}>{loading ? (en ? "Buffering" : "Puffert") : playing ? (en ? "Playing" : "Wiedergabe") : (en ? "Stopped" : "Gestoppt")}</span>
    </header>
    <div className="bz-stem-transport">
      <button type="button" onClick={toggle} aria-label={playing || loading ? (en ? "Pause all tracks" : "Alle Spuren pausieren") : (en ? "Play all tracks" : "Alle Spuren abspielen")}>{playing || loading ? <Pause size={17}/> : <Play size={17}/>}</button>
      <span>{clock(position)}</span>
      <input type="range" min={0} max={duration || 1} step=".01" value={Math.min(position, duration || 1)} disabled={!duration || (loading && !playing)} aria-label={en ? "Shared playback position" : "Gemeinsame Wiedergabeposition"} aria-valuetext={clock(position)} onChange={event => jump(Number(event.target.value))}/>
      <span>{clock(duration)}</span>
    </div>
    {loading && <p role="status">{en ? "Buffering the tracks…" : "Spuren werden gepuffert…"}</p>}
    {error && <p role="alert">{en ? "A track could not be played. Reload to retry. Check whether the result is still available." : "Eine Spur konnte nicht abgespielt werden. Lade die Seite neu und prüfe, ob das Ergebnis noch verfügbar ist."}</p>}
    <div className="bz-stem-strips" style={{ "--channels": stems.length } as CSSProperties}>
      {stems.map((stem, index) => {
        const label = names[stem]?.[en ? 1 : 0] ?? stem;
        const Icon = icons[stem as keyof typeof icons] || AudioLines;
        const value = faders[stem] ?? unity;
        const db = faderDb(value);
        const readout = value === 0 ? "−∞" : `${db > 0 ? "+" : ""}${db.toLocaleString(lang, { maximumFractionDigits: 1 })}`;
        return <div key={stem} className="bz-stem-strip" data-channel={stem} data-audible={isAudible(stem)}>
          <audio ref={node => { media.current[index] = node; }} preload={demo ? "none" : "metadata"} controlsList="nodownload"
            src={demo ? `/audio/stem-demo/${stem}.mp3` : `/api/stems?id=${id}&asset=${stem}&play=1`}
            onLoadedMetadata={updateDuration} onError={fail} onEnded={() => { stop(); setPosition(duration); }}/>
          <div className="bz-desk-name"><Icon size={17} aria-hidden="true"/><strong>{label}</strong></div>
          <svg viewBox="0 0 508 48" preserveAspectRatio="none" aria-hidden="true"><path ref={node => { waves.current[index] = node; }} d="M0 24H508" className={index % 2 ? "bz-trace-b" : "bz-trace-a"}/></svg>
          <div className="bz-stem-buttons">
            <button type="button" aria-pressed={muted.includes(stem)} aria-label={en ? `Mute ${label}` : `${label} stummschalten`} onClick={() => toggleStrip(muted, stem, setMuted)}>M</button>
            <button type="button" aria-pressed={solo.includes(stem)} aria-label={`Solo · ${label}`} onClick={() => toggleStrip(solo, stem, setSolo)}>S</button>
          </div>
          <div className="bz-desk-controls">
            <div className="bz-desk-fader">
              <div className="bz-desk-ticks" aria-hidden="true">{[[100, "+6"], [unity, "0"], [66, "−6"], [46, "−15"], [27, "−30"], [0, "−∞"]].map(([at, text]) => <span key={at} style={{ bottom: `${at}%` }}>{text}</span>)}</div>
              <input type="range" min="0" max="100" step="1" value={value} aria-orientation="vertical" aria-label={en ? `${label} level` : `Pegel · ${label}`} aria-valuetext={`${readout} dB`} onChange={event => {
                const next = Number(event.currentTarget.value);
                setFaders(previous => ({ ...previous, [stem]: next }));
              }}/>
            </div>
            <div className="bz-stem-meter" aria-hidden="true"><i ref={node => { meters.current[index] = node; }}/></div>
          </div>
          <div className="bz-desk-readout">
            <span>{readout} <small>dB</small></span>
            <button type="button" disabled={value === unity} title={en ? "Reset to 0 dB" : "Auf 0 dB zurücksetzen"} aria-label={en ? `Reset ${label} level` : `Pegel zurücksetzen · ${label}`} onClick={() => setFaders(previous => ({ ...previous, [stem]: unity }))}><RotateCcw size={13}/></button>
          </div>
        </div>;
      })}
    </div>
    <p className="bz-desk-note">{demo
      ? (en ? "Faders, mute and solo let you explore this demo mix." : "Mit Fadern, Mute und Solo kannst du diesen Demo-Mix erkunden.")
      : (en ? "Faders control playback. WAV downloads use the original stem levels." : "Die Fader regeln die Wiedergabe. WAV-Downloads behalten die Originalpegel der Spuren.")}</p>
  </div>;
}
