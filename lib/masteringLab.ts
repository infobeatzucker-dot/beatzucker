export const labFormats = {
  wav32: { label: "WAV 32-bit float", ext: "wav", mime: "audio/wav" },
  wav24: { label: "WAV 24-bit", ext: "wav", mime: "audio/wav" },
  wav16: { label: "WAV 16-bit", ext: "wav", mime: "audio/wav" },
  flac: { label: "FLAC 24-bit", ext: "flac", mime: "audio/flac" },
  mp3320: { label: "MP3 320 kbps", ext: "mp3", mime: "audio/mpeg" },
  mp3128: { label: "MP3 128 kbps", ext: "mp3", mime: "audio/mpeg" },
  aac256: { label: "AAC 256 kbps", ext: "m4a", mime: "audio/mp4" },
} as const;

export type LabFormat = keyof typeof labFormats;
export const labMaxBytes = 192 * 1024 * 1024;
export const labGenres = ["auto", "pop", "electronic", "hiphop", "rock", "metal", "rnb", "jazz", "classical", "ambient", "country"] as const;
export const labTargets = ["spotify", "apple", "youtube", "club", "broadcast", "custom"] as const;
export const labNoStore = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export function labFormat(value: unknown): value is LabFormat {
  return typeof value === "string" && Object.hasOwn(labFormats, value);
}
