import type { Lang } from "@/lib/types/mastering";

export const releaseCheckMaxBytes = 192 * 1024 * 1024;

export const AUDIO_RELEASE_TOOLS = {
  "release-check": {
    de: { title: "Release-Check für fertige Masters", summary: "Miss Lautheit und True Peak deiner fertigen WAV-, FLAC-, MP3- oder AAC-Datei und prüfe Codec, Samplerate und Kanäle.", action: "Master prüfen" },
    en: { title: "Release Check for Finished Masters", summary: "Measure loudness and true peak of a finished WAV, FLAC, MP3 or AAC file and inspect its codec, sample rate and channels.", action: "Check master" },
  },
  "mastering-blindtest": {
    de: { title: "Mastering-Blindtest online", summary: "Vergleiche zwei Master synchron, pegelangepasst und mit verdeckter Zuordnung.", action: "Blindtest starten" },
    en: { title: "Online Mastering Blind Test", summary: "Compare two masters in sync at matched loudness with their identities hidden.", action: "Start blind test" },
  },
  "dj-loop-editor": {
    de: { title: "DJ- & Loop-Editor online", summary: "Schneide Loops anhand von BPM und Takten, höre den Übergang und exportiere einen WAV-Loop oder einen verlängerten DJ-Edit.", action: "Loop bauen" },
    en: { title: "Online DJ & Loop Editor", summary: "Build loops by BPM and bars, audition the seam and export a WAV loop or extended DJ edit.", action: "Build a loop" },
  },
  "audio-visualizer": {
    de: { title: "Audio-Visualizer für Shorts und Reels", summary: "Erstelle ein 9:16-Musikvideo mit Cover, Wellenform und optionalem Original-/Master-Wechsel.", action: "Video erstellen" },
    en: { title: "Audio Visualizer for Shorts and Reels", summary: "Make a 9:16 music video with cover art, a waveform and an optional original-to-master switch.", action: "Make a video" },
  },
} as const;

export type AudioReleaseTool = keyof typeof AUDIO_RELEASE_TOOLS;
export const releaseToolSlugs = Object.keys(AUDIO_RELEASE_TOOLS) as AudioReleaseTool[];
export function releaseToolHref(slug: AudioReleaseTool, lang: Lang) {
  return (lang === "en" ? "/en" : "") + "/tools/" + slug;
}
