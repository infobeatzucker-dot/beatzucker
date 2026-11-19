"use client";

import { useMemo } from "react";
import { AudioLines, ScanLine } from "lucide-react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import type { AnalysisData, Lang } from "@/lib/types/mastering";

const bands = [
  ["rms_sub", "20–80", 80], ["rms_low", "80–500", 500], ["rms_mid", "0.5–5k", 5000],
  ["rms_high", "5–12k", 12000], ["rms_air", "12–20k", 20000],
] as const;

export function selectLevelChanges(original: Float32Array, master: Float32Array, duration: number) {
  if (original.length !== master.length || !Number.isFinite(duration) || duration <= 0) return [];
  const bins = original.length;
  const step = Math.max(1, Math.round(bins / duration));
  const entries = [];
  for (let start = 0; start + step <= bins; start += step) {
    let a = 0, b = 0;
    for (let i = start; i < start + step; i++) {
      a += original[i] ** 2;
      b += master[i] ** 2;
    }
    if (Math.min(a, b) / step < 0.0001 || !Number.isFinite(a + b)) continue;
    entries.push({ time: (start + step * .5) / bins * duration, gain: 10 * Math.log10(b / a) });
  }
  if (entries.length < 3) return [];
  const gains = entries.map(({ gain }) => gain).sort((a, b) => a - b);
  const baseline = gains[Math.floor(gains.length / 2)];
  const results: { time: number; gain: number; change: number }[] = [];
  const candidates = entries.map(entry => ({ ...entry, change: entry.gain - baseline }));
  for (const entry of candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))) {
    if (Math.abs(entry.change) < .75 || results.length === 3) break;
    if (results.every(point => Math.abs(point.time - entry.time) >= Math.max(2, duration * .12))) results.push(entry);
  }
  return results.sort((a, b) => a.time - b.time);
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function MasteringSoundProfile({ original, master, lang }: { original: AnalysisData; master: AnalysisData; lang: Lang }) {
  const engine = useAudioEngine();
  const a = engine?.staticWaveform, b = engine?.staticWaveformB;
  const duration = original.duration_seconds;
  const aligned = Math.abs(duration - master.duration_seconds) < .1;
  const points = useMemo(() => a && b && aligned ? selectLevelChanges(a, b, duration) : [], [a, b, aligned, duration]);
  const en = lang === "en";
  const format = (n: number, digits = 1) => Number.isFinite(n) ? n.toLocaleString(lang, { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";
  const active = engine?.mode ?? "A";
  const measured = bands.map(([key, label, upper]) => ({
    label, a: original[key], b: master[key], available: upper <= Math.min(original.sample_rate, master.sample_rate) / 2,
  }));
  const values = measured.filter(item => item.available).flatMap(item => [item.a, item.b]).filter(Number.isFinite);
  const bottom = Math.min(-60, ...values);
  const top = Math.max(-10, ...values);
  const y = (value: number) => 89 - 75 * (value - bottom) / (top - bottom);
  const line = (version: "a" | "b") => {
    let previous = -2;
    return measured.map((band, index) => {
      if (!band.available || !Number.isFinite(band[version])) return "";
      const command = index === previous + 1 ? "L" : "M";
      previous = index;
      return `${command}${index * 100 + 50} ${y(band[version])}`;
    }).join(" ");
  };
  return <section className="bz-signal-card bz-sound-profile">
    <header><h3><AudioLines size={19}/>{en ? "Sound fingerprint" : "Klang-Fingerabdruck"}</h3><span>{en ? "Measured before and after" : "Vorher und nachher gemessen"}</span></header>
    <div className="bz-signal-legend">
      {(["A", "B"] as const).map(mode => <button key={mode} type="button" data-signal={mode} aria-pressed={active === mode} disabled={!engine || (mode === "B" && engine.masterUnavailable)} onClick={() => engine?.setMode(mode)}><i/>{mode === "A" ? "Original" : en ? "Mastered" : "Master"}</button>)}
    </div>
    <figure>
      <svg viewBox="0 0 500 100" preserveAspectRatio="none" aria-hidden="true" data-active={active}>
        {[0, .25, .5, .75, 1].map(t => <line className="bz-signal-grid" key={t} x1="0" x2="500" y1={14 + t * 75} y2={14 + t * 75}/>)}
        {(active === "A" ? ["b", "a"] as const : ["a", "b"] as const).map(version => <g key={version} className={`bz-profile-${version}`}>
          <path className={`bz-trace-${version}`} d={line(version)}/>
          {measured.map((item, index) => item.available && Number.isFinite(item[version]) && <circle key={item.label} className={`bz-band-${version}`} cx={index * 100 + 50} cy={y(item[version])} r="3.4"><title>{item.label} Hz · {version === "a" ? "Original" : "Master"} · {format(item[version])} dBFS</title></circle>)}
        </g>)}
      </svg>
      <div className="bz-band-labels">{measured.map(item => <span key={item.label}>{item.label}{item.available ? "" : " —"}</span>)}</div>
      <figcaption>{en ? "Frequency bands (Hz) · RMS level (dBFS)" : "Frequenzbänder (Hz) · RMS-Pegel (dBFS)"} · {format(bottom, 0)} … {format(top, 0)}</figcaption>
      <table className="sr-only"><caption>{en ? "Band levels in dBFS" : "Bandpegel in dBFS"}</caption><thead><tr><th>Hz</th><th>Original</th><th>Master</th></tr></thead><tbody>{measured.map(item => <tr key={item.label}><th>{item.label}</th><td>{item.available ? format(item.a) : "—"}</td><td>{item.available ? format(item.b) : "—"}</td></tr>)}</tbody></table>
    </figure>
    <dl className="bz-signal-stats">
      {[
        [en ? "Loudness" : "Lautheit", original.integrated_lufs, master.integrated_lufs, "LUFS"],
        [en ? "Loudness range" : "Lautheitsdynamik", original.lra, master.lra, "LU"],
        [en ? "Stereo width (side/mid)" : "Stereobreite (Seite/Mitte)", original.stereo_width, master.stereo_width, "×"],
      ].map(([label, before, after, unit]) => <div key={label}><dt>{label}</dt><dd><span className={active === "A" ? "is-current" : ""}>{format(Number(before))}</span><span>→</span><span className={active === "B" ? "is-current" : ""}>{format(Number(after))}</span><small>{unit}</small></dd></div>)}
    </dl>
    <div className="bz-change-map">
      <h4><ScanLine size={16}/>{en ? "What changed?" : "Was hat sich verändert?"}</h4>
      {points.length ? <>
        <p>{en ? "Places where mastering changed the level more or less than usual for this track. Jump to each point in the A/B player." : "Stellen, an denen das Mastering den Pegel stärker oder schwächer verändert hat als im übrigen Track. Spring im A/B-Player direkt dorthin."}</p>
        <div className="bz-change-track" aria-hidden="true">{points.map(point => <i key={point.time} style={{ left: `${point.time / duration * 100}%` }}/>)}</div>
        <div className="bz-change-points">{points.map(point => <button key={point.time} type="button" disabled={engine?.masterUnavailable} onClick={() => engine?.seek(point.time)}><strong>{clock(point.time)}</strong><span>{point.change > 0 ? "+" : ""}{format(point.change)} dB</span></button>)}</div>
      </> : <p>{a && b && aligned
        ? (en ? "No distinct local level changes to highlight." : "Keine ausgeprägten lokalen Pegeländerungen zum Markieren.")
        : (a && b) || engine?.masterUnavailable
          ? (en ? "The waveforms could not be compared." : "Die Wellenformen konnten nicht verglichen werden.")
          : (en ? "Markers appear when comparable waveforms are available." : "Die Markierungen erscheinen, sobald vergleichbare Wellenformen verfügbar sind.")}</p>}
    </div>
  </section>;
}
