import type { Module, Settings } from "./settings";

type ModulePreset = {
  id: string;
  name: readonly [string, string];
  settings: Partial<Omit<Settings, "active">>;
};

export const modulePresets: Record<Module, readonly ModulePreset[]> = {
  input: [
    { id: "headroom", name: ["Mehr Headroom", "More headroom"], settings: { trim: -6 } },
    { id: "ease", name: ["Leicht absenken", "Gentle trim"], settings: { trim: -3 } },
    { id: "lift", name: ["Leicht anheben", "Gentle lift"], settings: { trim: 2 } },
  ],
  eq: [
    { id: "body", name: ["Warmer Grundton", "Warm body"], settings: { eq: [1.1, .3, -.35, -.65] } },
    { id: "mids", name: ["Klare Mitten", "Clean mids"], settings: { eq: [0, -1.3, .8, .2] } },
    { id: "air", name: ["Offene Höhen", "Open highs"], settings: { eq: [-.35, -.5, .6, 1.4] } },
  ],
  deesser: [
    { id: "gentle", name: ["Sanfte Zischlautkontrolle", "Gentle sibilance control"], settings: { deessFrequency: 6800, deessThreshold: -23, deessAmount: 24 } },
    { id: "presence", name: ["Harte Präsenz mildern", "Tame harsh presence"], settings: { deessFrequency: 5200, deessThreshold: -28, deessAmount: 38 } },
    { id: "cymbal", name: ["Scharfe Becken", "Sharp cymbals"], settings: { deessFrequency: 8500, deessThreshold: -29, deessAmount: 47 } },
  ],
  ducking: [
    { id: "clean", name: ["Dezente Basskontrolle", "Subtle bass control"], settings: { duckDepth: 1.5, duckFrequency: 75, duckThreshold: -28, duckRelease: 105 } },
    { id: "club", name: ["EDM / Club", "EDM / Club"], settings: { duckDepth: 3, duckFrequency: 90, duckThreshold: -31, duckRelease: 140 } },
    { id: "fast", name: ["Techno / schnelle Kicks", "Techno / fast kicks"], settings: { duckDepth: 2.5, duckFrequency: 80, duckThreshold: -31, duckRelease: 95 } },
    { id: "trap", name: ["Trap / 808", "Trap / 808"], settings: { duckDepth: 2, duckFrequency: 65, duckThreshold: -28, duckRelease: 175 } },
  ],
  dynamics: [
    { id: "light", name: ["Sanfter Zusammenhalt", "Gentle cohesion"], settings: { bands: [-20, -23, -26, -27].map(threshold => ({ threshold, ratio: 1.25 })) } },
    { id: "bass", name: ["Straffer Bass", "Tighter lows"], settings: { bands: [{ threshold: -23, ratio: 2.1 }, { threshold: -24, ratio: 1.7 }, { threshold: -22, ratio: 1 }, { threshold: -22, ratio: 1 }] } },
    { id: "upper", name: ["Ruhigere Höhen", "Smoother highs"], settings: { bands: [{ threshold: -22, ratio: 1 }, { threshold: -22, ratio: 1 }, { threshold: -26, ratio: 1.25 }, { threshold: -30, ratio: 1.65 }] } },
  ],
  stereo: [
    { id: "focus", name: ["Zentrierter Tiefton", "Centered bass"], settings: { width: 100, monoBass: 58 } },
    { id: "wide", name: ["Dezent breiter", "Subtly wider"], settings: { width: 114, monoBass: 22 } },
    { id: "tight", name: ["Engeres Panorama", "Tighter image"], settings: { width: 83, monoBass: 20 } },
  ],
  saturation: [
    { id: "soft", name: ["Sanfte Abrundung", "Soft rounding"], settings: { saturation: 12 } },
    { id: "warm", name: ["Wärmere Färbung", "Warmer color"], settings: { saturation: 26 } },
    { id: "dense", name: ["Dichtere Spitzen", "Denser peaks"], settings: { saturation: 45 } },
  ],
  finalEq: [
    { id: "open", name: ["Mehr Luft", "More air"], settings: { finalAir: 1.6, finalFrequency: 10500 } },
    { id: "soft", name: ["Sanfter Hochton", "Softer highs"], settings: { finalAir: -1.3, finalFrequency: 9400 } },
    { id: "sheen", name: ["Feiner Glanz", "Subtle sheen"], settings: { finalAir: 2, finalFrequency: 13500 } },
  ],
  bus: [
    { id: "light", name: ["Leicht verbinden", "Gentle glue"], settings: { busThreshold: -18, busRatio: 1.3 } },
    { id: "solid", name: ["Kompakter Mix", "More compact mix"], settings: { busThreshold: -22, busRatio: 1.8 } },
    { id: "firm", name: ["Kräftiger Zugriff", "Firmer control"], settings: { busThreshold: -26, busRatio: 2.3 } },
  ],
  limiter: [
    { id: "peak", name: ["Spitzen abfangen", "Peak control"], settings: { drive: 0, ceiling: -1, release: 100 } },
    { id: "lift", name: ["Moderater Pegel", "Moderate lift"], settings: { drive: 2.2, ceiling: -1, release: 120 } },
    { id: "punch", name: ["Druckvoll", "Punchy"], settings: { drive: 4.2, ceiling: -.9, release: 75 } },
  ],
};

const genres = {
  pop: ["Pop", "Pop"],
  electronic: ["Electronic / Dance", "Electronic / Dance"],
  hiphop: ["Hip-Hop / Trap", "Hip-hop / Trap"],
  rock: ["Rock", "Rock"],
  jazz: ["Jazz / Akustik", "Jazz / Acoustic"],
} as const;

type Genre = keyof typeof genres;
type Patch = ModulePreset["settings"];
const bands = (thresholds: number[], ratios: number[]) => ({
  bands: thresholds.map((threshold, i) => ({ threshold, ratio: ratios[i] })),
});

const genreSettings: Record<Exclude<Module, "ducking">, Record<Genre, Patch>> = {
  input: {
    pop: { trim: -3 }, electronic: { trim: -6 }, hiphop: { trim: -5 }, rock: { trim: -4 }, jazz: { trim: -2 },
  },
  eq: {
    pop: { eq: [.5, -.8, 1, .6] }, electronic: { eq: [1.1, -.7, .3, .8] },
    hiphop: { eq: [1.5, -.6, .7, -.2] }, rock: { eq: [.4, -.9, .85, .3] }, jazz: { eq: [.35, -.2, .2, .25] },
  },
  deesser: {
    pop: { deessFrequency: 6800, deessThreshold: -24, deessAmount: 28 },
    electronic: { deessFrequency: 8400, deessThreshold: -26, deessAmount: 30 },
    hiphop: { deessFrequency: 5900, deessThreshold: -26, deessAmount: 32 },
    rock: { deessFrequency: 7600, deessThreshold: -23, deessAmount: 24 },
    jazz: { deessFrequency: 7400, deessThreshold: -20, deessAmount: 15 },
  },
  dynamics: {
    pop: bands([-20, -22, -25, -27], [1.4, 1.5, 1.45, 1.25]),
    electronic: bands([-22, -24, -24, -27], [1.75, 1.6, 1.25, 1.2]),
    hiphop: bands([-24, -23, -26, -26], [1.65, 1.4, 1.5, 1.18]),
    rock: bands([-19, -24, -24, -27], [1.32, 1.58, 1.48, 1.3]),
    jazz: bands([-18, -21, -23, -25], [1.12, 1.15, 1.12, 1.1]),
  },
  stereo: {
    pop: { width: 108, monoBass: 25 }, electronic: { width: 114, monoBass: 42 },
    hiphop: { width: 104, monoBass: 55 }, rock: { width: 110, monoBass: 16 }, jazz: { width: 102, monoBass: 8 },
  },
  saturation: {
    pop: { saturation: 12 }, electronic: { saturation: 19 }, hiphop: { saturation: 25 }, rock: { saturation: 21 }, jazz: { saturation: 7 },
  },
  finalEq: {
    pop: { finalAir: 1, finalFrequency: 11200 }, electronic: { finalAir: .7, finalFrequency: 13200 },
    hiphop: { finalAir: -.6, finalFrequency: 9900 }, rock: { finalAir: .6, finalFrequency: 11600 }, jazz: { finalAir: .4, finalFrequency: 11200 },
  },
  bus: {
    pop: { busThreshold: -21, busRatio: 1.5 }, electronic: { busThreshold: -24, busRatio: 1.8 },
    hiphop: { busThreshold: -22, busRatio: 1.6 }, rock: { busThreshold: -21, busRatio: 1.7 }, jazz: { busThreshold: -17, busRatio: 1.2 },
  },
  limiter: {
    pop: { drive: 1.8, ceiling: -1, release: 105 }, electronic: { drive: 3, ceiling: -1, release: 80 },
    hiphop: { drive: 2.3, ceiling: -1, release: 125 }, rock: { drive: 1.6, ceiling: -1, release: 135 }, jazz: { drive: .4, ceiling: -1.2, release: 165 },
  },
};

export function genreModulePresets(module: Module): ModulePreset[] {
  if (module === "ducking") return [];
  return (Object.keys(genres) as Genre[]).map(genre => ({
    id: `genre-${genre}`, name: genres[genre], settings: genreSettings[module][genre],
  }));
}
