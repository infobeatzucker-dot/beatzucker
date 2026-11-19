"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";
import { stopGlobalAudio } from "@/lib/globalAudio";
import { StudioDial, StudioMeter } from "./StudioControls";

type Track = { id:number; file:File; analysis:AnalysisData };
const trimFor = (track: Track, target: number) => Math.min(target - track.analysis.integrated_lufs, -1 - track.analysis.true_peak);
const clock = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;

export default function AlbumAuditionDesk({ tracks, median, lang }: { tracks: Track[]; median: number; lang: Lang }) {
  const en = lang === "en";
  const [override, setOverride] = useState<number | null>(null);
  const [match, setMatch] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const media = useRef<HTMLAudioElement>(null);
  const graph = useRef<{ context: AudioContext; gain: GainNode } | null>(null);
  const current = useRef<{ id: number; url: string } | null>(null);
  const attempt = useRef(0);
  const target = override ?? Math.round(median * 10) / 10;
  const track = tracks.find(item => item.id === selected);
  const gain = track && match ? 10 ** (trimFor(track, target) / 20) : 1;
  const number = (n: number) => n.toLocaleString(lang, { minimumFractionDigits:1, maximumFractionDigits:1 });

  useEffect(() => {
    const output = graph.current;
    if (output) output.gain.gain.setTargetAtTime(gain, output.context.currentTime, .016);
  }, [gain]);

  useEffect(() => {
    const player = media.current;
    return () => {
      attempt.current++;
      player?.pause();
      if (current.current) URL.revokeObjectURL(current.current.url);
      current.current = null;
      if (graph.current) void graph.current.context.close().catch(() => {});
      graph.current = null;
    };
  }, []);

  useEffect(() => {
    if (!track && current.current) {
      attempt.current++;
      media.current?.pause();
      media.current?.removeAttribute("src");
      media.current?.load();
      URL.revokeObjectURL(current.current.url);
      current.current = null;
      setSelected(null);
      setPlaying(false);
      setError(false);
    }
  }, [track]);

  async function listen(next: Track) {
    const player = media.current;
    if (!player) return;
    const token = ++attempt.current;
    if (current.current?.id === next.id && !player.paused) { player.pause(); return; }
    stopGlobalAudio();
    setError(false);
    try {
      if (!graph.current) {
        const context = new AudioContext();
        const gain = context.createGain();
        context.createMediaElementSource(player).connect(gain).connect(context.destination);
        graph.current = { context, gain };
      }
      const output = graph.current;
      output.gain.gain.cancelScheduledValues(output.context.currentTime);
      output.gain.gain.setValueAtTime(match ? 10 ** (trimFor(next, target) / 20) : 1, output.context.currentTime);
      if (current.current?.id !== next.id || player.error) {
        player.pause();
        if (current.current) URL.revokeObjectURL(current.current.url);
        const url = URL.createObjectURL(next.file);
        current.current = { id: next.id, url };
        setPosition(0); setDuration(0);
        player.src = url;
        setSelected(next.id);
      }
      await Promise.all([output.context.resume(), player.play()]);
    } catch {
      if (token === attempt.current) { player.pause(); setError(true); }
    }
  }

  return <div className="bz-hardware bz-album-desk">
    <div className="bz-hardware-heading"><Headphones size={19}/><h3>{en ? "Album monitoring" : "Album-Abhöre"}</h3></div>
    <div className="bz-album-master">
      <StudioDial label={en ? "Comparison target" : "Vergleichsziel"} reading={`${number(target)} LUFS`} value={target}
        min={Math.min(-32, Math.floor(target), Math.floor(median))} max={Math.max(-6, Math.ceil(target), Math.ceil(median))} step={.1} change={setOverride}/>
      <div>
        <div className="bz-hardware-keys">
          <button type="button" aria-pressed={!match} onClick={() => setMatch(false)}>{en ? "Original levels" : "Originalpegel"}</button>
          <button type="button" aria-pressed={match} onClick={() => setMatch(true)}>{en ? "Match preview" : "Abhöre angleichen"}</button>
        </div>
        <button className="bz-median" type="button" disabled={override === null} onClick={() => setOverride(null)}>{en ? "Reset to album median" : "Auf Album-Median zurücksetzen"}</button>
        <p>{en ? "Preview gain is capped to leave 1 dB of measured true-peak headroom. Files are played locally." : "Die Abhöre begrenzt den Pegel anhand des gemessenen True Peak auf −1 dBTP. Die Dateien werden lokal abgespielt."}</p>
      </div>
    </div>
    <audio ref={media} preload="none" hidden onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}/>
    {track && <div className="bz-album-transport">
      <button type="button" aria-label={playing ? (en ? "Pause preview" : "Abhöre pausieren") : (en ? "Play preview" : "Abhöre abspielen")} onClick={() => void listen(track)}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
      <span>{clock(position)}</span>
      <input type="range" min={0} max={duration || 1} step={.05} value={Math.min(duration, position)} disabled={!duration}
        aria-label={en ? "Playback position" : "Abhörposition"} aria-valuetext={clock(position)}
        onChange={event => { const value = Number(event.target.value); if (media.current) media.current.currentTime = value; setPosition(value); }}/>
      <span>{clock(duration)}</span>
    </div>}
    {error && <p role="alert">{en ? "Your browser could not play this audio file." : "Dein Browser konnte diese Audiodatei nicht abspielen."}</p>}
    <div className="bz-album-channels">{tracks.map(item => {
      const active = selected === item.id && playing;
      const requested = target - item.analysis.integrated_lufs;
      const limited = trimFor(item, target);
      return <article key={item.id} data-active={active}>
        <strong title={item.file.name}>{item.file.name}</strong>
        <StudioMeter label={en ? "Measured" : "Gemessen"} reading={`${number(item.analysis.integrated_lufs)} LUFS`} fraction={(item.analysis.integrated_lufs+48)/48}/>
        <p><span>{en ? "To target" : "Zum Ziel"}</span><b>{requested > 0 ? "+" : ""}{number(requested)} dB</b></p>
        {limited < requested - .05 && <p><span>{en ? "Safe preview" : "Sichere Abhöre"}</span><b>{limited > 0 ? "+" : ""}{number(limited)} dB</b></p>}
        <button type="button" aria-pressed={active} aria-label={`${active ? (en ? "Pause" : "Pausieren") : "Solo"} · ${item.file.name}`} onClick={() => void listen(item)}>{active ? <Pause size={15}/> : <Play size={15}/>} {active ? (en ? "Pause" : "Pause") : "Solo"}</button>
      </article>;
    })}</div>
  </div>;
}
