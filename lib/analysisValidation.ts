import { createHmac, timingSafeEqual } from "crypto";
import type { AnalysisData } from "@/lib/types/mastering";

type NumericRule = readonly [min: number, max: number];

const NUMERIC_RULES: Record<Exclude<keyof AnalysisData, "key" | "clipping_detected" | "analysis_token">, NumericRule> = {
  integrated_lufs: [-100, 10], true_peak: [-160, 20], dr_value: [0, 60],
  crest_factor: [0, 80], lra: [0, 80], rms_sub: [-160, 20], rms_low: [-160, 20],
  rms_mid: [-160, 20], rms_high: [-160, 20], rms_air: [-160, 20],
  spectral_centroid: [0, 100000], spectral_rolloff: [0, 100000],
  spectral_flatness: [0, 1], stereo_width: [0, 20], mono_compatibility: [-1, 1],
  bpm: [0, 400], transient_density: [0, 100], dc_offset: [-1, 1],
  duration_seconds: [0, 24 * 60 * 60], sample_rate: [4000, 768000],
  bit_depth: [0, 64], channels: [1, 32],
};

export function normalizeAnalysis(value: unknown): AnalysisData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, [min, max]] of Object.entries(NUMERIC_RULES)) {
    const number = input[key];
    if (typeof number !== "number" || !Number.isFinite(number) || number < min || number > max) return null;
    output[key] = number;
  }
  if (typeof input.key !== "string" || input.key.length > 80) return null;
  if (typeof input.clipping_detected !== "boolean") return null;
  output.key = input.key;
  output.clipping_detected = input.clipping_detected;
  return output as unknown as AnalysisData;
}

function canonicalAnalysis(analysis: AnalysisData): string {
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(NUMERIC_RULES)) ordered[key] = analysis[key as keyof AnalysisData];
  ordered.key = analysis.key;
  ordered.clipping_detected = analysis.clipping_detected;
  return JSON.stringify(ordered);
}

function signingSecret(): string {
  return process.env.ANALYSIS_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function signAnalysis(fileId: string, analysis: AnalysisData): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(fileId).update("\0").update(canonicalAnalysis(analysis)).digest("hex");
}

export function verifyAnalysis(fileId: string, analysis: AnalysisData, token: unknown): boolean {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = signAnalysis(fileId, analysis);
  if (!expected) return false;
  return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
}

export function normalizeReferenceAnalysis(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const rules: Record<string, NumericRule> = {
    integrated_lufs: [-100, 10], true_peak: [-160, 20],
    spectral_centroid: [0, 100000], spectral_rolloff: [0, 100000],
    spectral_flatness: [0, 1], rms_sub: [-160, 20], rms_low: [-160, 20],
    rms_mid: [-160, 20], rms_high: [-160, 20], rms_air: [-160, 20],
    stereo_width: [0, 20], mono_compatibility: [-1, 1],
    crest_factor: [0, 80], lra: [0, 80], transient_density: [0, 100],
  };
  const output: Record<string, number> = {};
  for (const [key, [min, max]] of Object.entries(rules)) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
    output[key] = value;
  }
  return typeof output.spectral_centroid === "number" && typeof output.rms_sub === "number" ? output : null;
}
