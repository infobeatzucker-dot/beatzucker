import type { Lang } from "@/lib/types/mastering";

export default function AudioCutLoupe({ audio, at, side, lang }: { audio: AudioBuffer; at: number; side: "start" | "end"; lang: Lang }) {
  const samples = audio.getChannelData(0);
  const center = Math.round(at * audio.sampleRate);
  const radius = Math.round(.08 * audio.sampleRate);
  const count = 240;
  const kept = side === "start" ? 240 : 0;
  const path = Array.from({ length: count }, (_, column) => {
    const start = Math.max(0, Math.floor(center - radius + 2 * radius * column / count));
    const end = Math.min(samples.length, Math.floor(center - radius + 2 * radius * (column + 1) / count));
    if (end <= start) return "";
    let min = 1, max = -1;
    for (let i = start; i < end; i++) {
      const value = Math.max(-1, Math.min(1, samples[i]));
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return `M${2 * column + 1} ${42 - max * 37}V${42 - min * 37 + .6}`;
  }).join(" ");
  return <div className="bz-cut-loupe">
    <div><strong>{side === "start" ? "A" : "B"} · {lang === "en" ? "Cut detail" : "Schnittlupe"}</strong><span>{at.toLocaleString(lang, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} s</span></div>
    <svg viewBox="0 0 480 84" preserveAspectRatio="none" aria-hidden="true">
      <rect className="bz-cut-kept" x={kept} y="0" width="240" height="84"/>
      <line className="bz-signal-grid" x1="0" x2="480" y1="42" y2="42"/>
      <path d={path} className="bz-trace-a"/>
      <line className="bz-cut-boundary" x1="240" x2="240" y1="0" y2="84"/>
    </svg>
    <div><span>−80 ms</span><span>+80 ms</span></div>
  </div>;
}
