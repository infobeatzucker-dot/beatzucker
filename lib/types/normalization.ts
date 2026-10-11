export interface NormalizationResult {
  before: { integrated_lufs: number; true_peak: number };
  after: { integrated_lufs: number; true_peak: number };
  gain_db: number;
  target_lufs: number;
  peak_limited: boolean;
  start: number;
  end: number;
  duration: number;
  sample_rate: number;
  channels: number;
}

export function parseNormalizationResult(value: string | null): NormalizationResult {
  const result = JSON.parse(value ?? "null") as NormalizationResult | null;
  if (!result || ![result.before?.integrated_lufs, result.before?.true_peak,
    result.after?.integrated_lufs, result.after?.true_peak, result.gain_db, result.target_lufs,
    result.start, result.end, result.duration, result.sample_rate, result.channels].every(Number.isFinite) ||
    typeof result.peak_limited !== "boolean" || result.after.true_peak > -1 ||
    result.duration < 0.4 || result.end <= result.start || ![1, 2].includes(result.channels)) {
    throw new Error("Invalid normalization measurements");
  }
  return result;
}
