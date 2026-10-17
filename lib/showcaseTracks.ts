import prepared from "@/public/audio/showcase/manifest.json";

export type ShowcaseSide = "original" | "master";
export type ShowcaseAudio = { url: string; bytes: number; duration: number; metrics: { lufs: number; truePeak: number; crest: number }; waveform: number[] };
export type ShowcaseTrack = { id: string; title: string; genre: string; sourceStart: number; duration: number; original: ShowcaseAudio; master: ShowcaseAudio };
export const SHOWCASE_TRACKS: ShowcaseTrack[] = prepared.tracks;
export function validShowcaseTrack(value: unknown): value is ShowcaseTrack {
  if (!value || typeof value !== "object") return false;
  const track = value as ShowcaseTrack;
  if (typeof track.id !== "string" || !/^[a-z0-9-]{1,90}$/.test(track.id) || typeof track.title !== "string" || !track.title || track.title.length > 90 || typeof track.genre !== "string" || !track.genre || track.genre.length > 60 || track.duration !== 24 || !Number.isFinite(track.sourceStart) || track.sourceStart < 0 || track.sourceStart > 600) return false;
  return (["original","master"] as const).every(side => {
    const audio = track[side];
    return audio && typeof audio.url === "string" && (/^\/audio\/showcase\/[a-z0-9-]+\.mp3$/.test(audio.url) || /^\/api\/showcase\/audio\/[0-9a-f-]{36}-(original|master)\.mp3$/.test(audio.url)) && Number.isFinite(audio.bytes) && audio.bytes > 0 && audio.bytes < 2_000_000 && audio.duration > 23.9 && audio.duration < 24.2 && audio.metrics && [audio.metrics.lufs,audio.metrics.truePeak,audio.metrics.crest].every(Number.isFinite) && Array.isArray(audio.waveform) && audio.waveform.length === 128 && audio.waveform.every(peak => typeof peak === "number" && Number.isFinite(peak) && peak >= 0);
  });
}

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
