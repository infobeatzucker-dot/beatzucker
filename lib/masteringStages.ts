export const MASTERING_STAGES = [
  { key: "dc", de: "DC-Offset", en: "DC removal" },
  { key: "gain", de: "Gain-Staging", en: "Gain staging" },
  { key: "eq", de: "Korrektur-EQ", en: "Correction EQ" },
  { key: "deesser", de: "De-Esser", en: "De-esser" },
  { key: "compression", de: "Multiband", en: "Multiband" },
  { key: "ms", de: "M/S-Stereo", en: "M/S stereo" },
  { key: "saturation", de: "Sättigung", en: "Saturation" },
  { key: "final_eq", de: "Final-EQ", en: "Final EQ" },
  { key: "bus_compression", de: "Bus-Kompression", en: "Bus compression" },
  { key: "limiting", de: "True-Peak-Limiter", en: "True peak limiter" },
  { key: "dithering", de: "Dithering / Export", en: "Dither / export" },
  { key: "codec_verify", de: "Codec-Prüfung", en: "Codec verification" },
] as const;
export const baseMasteringStage = (step?: string) => (step || "").replace(/_skipped$/, "");
export function masteringStageState(key: string, current?: string, skipped: readonly string[] = []) {
  if (skipped.includes(key) || current === `${key}_skipped`) return "skipped";
  const index = MASTERING_STAGES.findIndex(stage => stage.key === baseMasteringStage(current));
  const own = MASTERING_STAGES.findIndex(stage => stage.key === key);
  if (current === "post_analysis" || current === "complete") return "done";
  return own === index ? "active" : index > own ? "done" : "pending";
}
