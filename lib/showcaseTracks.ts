import prepared from "@/public/audio/showcase/manifest.json";

export type ShowcaseSide = "original" | "master";
export type ShowcaseAudio = { url: string; bytes: number; duration: number; metrics: { lufs: number; truePeak: number; crest: number }; waveform: number[] };
export type ShowcaseTrack = { id: string; title: string; genre: string; sourceStart: number; duration: number; original: ShowcaseAudio; master: ShowcaseAudio };
export const SHOWCASE_TRACKS: ShowcaseTrack[] = prepared.tracks;

/** Attenuation only: no EQ, enhancement or limiter is added to the demo. */
export function showcaseTrims(track: ShowcaseTrack, matched: boolean): Record<ShowcaseSide, number> {
  const a = track.original.metrics, b = track.master.metrics;
  if (!matched) {
    const headroom = Math.min(0, -.5 - Math.max(a.truePeak, b.truePeak));
    return { original: headroom, master: headroom };
  }
  const target = Math.min(a.lufs, b.lufs, a.lufs - .5 - a.truePeak, b.lufs - .5 - b.truePeak);
  return { original: target - a.lufs, master: target - b.lufs };
}

export function showcaseWavePath(track: ShowcaseTrack, side: ShowcaseSide, matched: boolean) {
  const gain = 10 ** (showcaseTrims(track, matched)[side] / 20);
  const maximum = Math.max(...track.original.waveform, ...track.master.waveform, .001);
  return track[side].waveform.map((peak, index) => {
    const height = Math.max(.7, Math.min(34, peak * gain / maximum * 34));
    const x = index / track[side].waveform.length * 1000;
    return `M${x.toFixed(2)},${(40-height).toFixed(2)}v${(height*2).toFixed(2)}`;
  }).join(" ");
}
