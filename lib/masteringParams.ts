import type { Lang } from "@/lib/types/mastering";

/**
 * Einzige Quelle der Wahrheit für die manuell justierbaren Mastering-Parameter.
 *
 * Die Wertebereiche hier MÜSSEN zu OVERRIDE_RANGES in python/ai_params.py passen.
 * Der Server klemmt ohnehin nochmal — das ist die eigentliche Absicherung —, aber
 * abweichende Grenzen würden dazu führen, dass ein Regler bis an einen Anschlag
 * fährt, den der Server danach still zurückdreht.
 */

export type ParamKey =
  | "highpass_freq"
  | "low_shelf_gain"
  | "mid_notch_gain"
  | "presence_gain"
  | "air_gain"
  | "mb_sub_threshold"  | "mb_sub_ratio"
  | "mb_low_threshold"  | "mb_low_ratio"
  | "mb_mid_threshold"  | "mb_mid_ratio"
  | "mb_high_threshold" | "mb_high_ratio"
  | "stereo_width"
  | "saturation_amount"
  | "bus_comp_threshold" | "bus_comp_ratio";

export type TabId = "eq" | "mb" | "ms" | "sat" | "bus";

export interface ParamDef {
  key: ParamKey;
  tab: TabId;
  label: { de: string; en: string };
  unit: { de: string; en: string };
  min: number;
  max: number;
  step: number;
  decimals: number;
  /** Neutralwert — der Fader wird gedämpft dargestellt, wenn er hier steht. */
  neutral?: number;
}

export const PARAM_DEFS: ParamDef[] = [
  // ── EQ ──────────────────────────────────────────────────────────────────────
  { key: "highpass_freq",  tab: "eq", label: { de: "Highpass",   en: "Highpass"  }, unit: { de: "Hz", en: "Hz" }, min: 20,  max: 200, step: 1,    decimals: 0 },
  { key: "low_shelf_gain", tab: "eq", label: { de: "Low Shelf",  en: "Low shelf" }, unit: { de: "dB · 80 Hz",    en: "dB · 80 Hz"    }, min: -6, max: 6, step: 0.1, decimals: 1, neutral: 0 },
  { key: "mid_notch_gain", tab: "eq", label: { de: "Mitten",     en: "Mids"      }, unit: { de: "dB · 280 Hz",   en: "dB · 280 Hz"   }, min: -6, max: 6, step: 0.1, decimals: 1, neutral: 0 },
  { key: "presence_gain",  tab: "eq", label: { de: "Präsenz",    en: "Presence"  }, unit: { de: "dB · 3 kHz",    en: "dB · 3 kHz"    }, min: -6, max: 6, step: 0.1, decimals: 1, neutral: 0 },
  { key: "air_gain",       tab: "eq", label: { de: "Luft",       en: "Air"       }, unit: { de: "dB · 12 kHz",   en: "dB · 12 kHz"   }, min: -6, max: 6, step: 0.1, decimals: 1, neutral: 0 },

  // ── Multiband ───────────────────────────────────────────────────────────────
  { key: "mb_sub_threshold",  tab: "mb", label: { de: "Sub Thr",   en: "Sub thr"   }, unit: { de: "dB · 20–80 Hz",   en: "dB · 20–80 Hz"   }, min: -30, max: 0, step: 0.5, decimals: 1 },
  { key: "mb_sub_ratio",      tab: "mb", label: { de: "Sub Ratio", en: "Sub ratio" }, unit: { de: ": 1", en: ": 1" }, min: 1, max: 8, step: 0.1, decimals: 2, neutral: 1 },
  { key: "mb_low_threshold",  tab: "mb", label: { de: "Bass Thr",  en: "Low thr"   }, unit: { de: "dB · 80–500 Hz",  en: "dB · 80–500 Hz"  }, min: -30, max: 0, step: 0.5, decimals: 1 },
  { key: "mb_low_ratio",      tab: "mb", label: { de: "Bass Ratio",en: "Low ratio" }, unit: { de: ": 1", en: ": 1" }, min: 1, max: 8, step: 0.1, decimals: 2, neutral: 1 },
  { key: "mb_mid_threshold",  tab: "mb", label: { de: "Mid Thr",   en: "Mid thr"   }, unit: { de: "dB · 500 Hz–5 kHz", en: "dB · 500 Hz–5 kHz" }, min: -30, max: 0, step: 0.5, decimals: 1 },
  { key: "mb_mid_ratio",      tab: "mb", label: { de: "Mid Ratio", en: "Mid ratio" }, unit: { de: ": 1", en: ": 1" }, min: 1, max: 8, step: 0.1, decimals: 2, neutral: 1 },
  { key: "mb_high_threshold", tab: "mb", label: { de: "Höhen Thr", en: "High thr"  }, unit: { de: "dB · 5–12 kHz",   en: "dB · 5–12 kHz"   }, min: -30, max: 0, step: 0.5, decimals: 1 },
  { key: "mb_high_ratio",     tab: "mb", label: { de: "Höhen Ratio", en: "High ratio" }, unit: { de: ": 1", en: ": 1" }, min: 1, max: 8, step: 0.1, decimals: 2, neutral: 1 },

  // ── Stereo / Sättigung / Bus ────────────────────────────────────────────────
  { key: "stereo_width",       tab: "ms",  label: { de: "Breite",   en: "Width"     }, unit: { de: "× Seitensignal", en: "× side signal" }, min: 0.5, max: 2.0, step: 0.01, decimals: 2, neutral: 1 },
  { key: "saturation_amount",  tab: "sat", label: { de: "Sättigung",en: "Saturation"}, unit: { de: "Drive", en: "Drive" }, min: 0, max: 0.5, step: 0.01, decimals: 2, neutral: 0 },
  { key: "bus_comp_threshold", tab: "bus", label: { de: "Bus Thr",  en: "Bus thr"   }, unit: { de: "dB", en: "dB" }, min: -32, max: -10, step: 0.5, decimals: 1 },
  { key: "bus_comp_ratio",     tab: "bus", label: { de: "Bus Ratio",en: "Bus ratio" }, unit: { de: ": 1", en: ": 1" }, min: 1, max: 3, step: 0.01, decimals: 2, neutral: 1 },
];

export const TABS: { id: TabId; label: { de: string; en: string } }[] = [
  { id: "eq",  label: { de: "EQ",         en: "EQ"         } },
  { id: "mb",  label: { de: "Multiband",  en: "Multiband"  } },
  { id: "ms",  label: { de: "Stereo",     en: "Stereo"     } },
  { id: "sat", label: { de: "Sättigung",  en: "Saturation" } },
  { id: "bus", label: { de: "Bus & Limiter", en: "Bus & limiter" } },
];

export type ParamValues = Partial<Record<ParamKey, number>>;

/** Validate the browser's manual adjustments before they enter the DSP service. */
export function normalizeParamOverrides(value: unknown): ParamValues | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const definitions = new Map(PARAM_DEFS.map((definition) => [definition.key, definition]));
  const entries = Object.entries(input);
  if (entries.length > PARAM_DEFS.length) return null;

  const output: ParamValues = {};
  for (const [key, raw] of entries) {
    const definition = definitions.get(key as ParamKey);
    if (!definition || typeof raw !== "number" || !Number.isFinite(raw)) return null;
    if (raw < definition.min || raw > definition.max) return null;
    output[definition.key] = raw;
  }
  return output;
}

/** Fallbacks, falls der Server (noch) keine Parameter mitgeliefert hat. */
const FALLBACKS: Record<ParamKey, number> = {
  highpass_freq: 30,
  low_shelf_gain: 0,
  mid_notch_gain: -0.65,
  presence_gain: 0.33,
  air_gain: 1.3,
  mb_sub_threshold: -16,  mb_sub_ratio: 2.3,
  mb_low_threshold: -20,  mb_low_ratio: 2.0,
  mb_mid_threshold: -22,  mb_mid_ratio: 1.65,
  mb_high_threshold: -24, mb_high_ratio: 1.52,
  stereo_width: 1.13,
  saturation_amount: 0.13,
  bus_comp_threshold: -24.5,
  bus_comp_ratio: 1.39,
};

/** Reglerwerte aus den vom Server gemeldeten Parametern ableiten. */
export function seedValues(serverParams?: Record<string, unknown> | null): ParamValues {
  const out: ParamValues = {};
  for (const def of PARAM_DEFS) {
    const raw = serverParams?.[def.key];
    const n = typeof raw === "number" && Number.isFinite(raw) ? raw : FALLBACKS[def.key];
    out[def.key] = Math.min(def.max, Math.max(def.min, n));
  }
  return out;
}

/** Nur die Werte melden, die vom Ausgangszustand abweichen. */
export function changedOnly(values: ParamValues, base: ParamValues): ParamValues {
  const out: ParamValues = {};
  for (const def of PARAM_DEFS) {
    const v = values[def.key];
    const b = base[def.key];
    if (v === undefined || b === undefined) continue;
    if (Math.abs(v - b) > 1e-6) out[def.key] = v;
  }
  return out;
}

export function formatValue(def: ParamDef, v: number): string {
  return v.toFixed(def.decimals);
}

export function t<T extends { de: string; en: string }>(obj: T, lang: Lang): string {
  return lang === "en" ? obj.en : obj.de;
}
