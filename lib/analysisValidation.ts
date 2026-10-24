import { createHmac, timingSafeEqual } from "crypto";
import type { AnalysisData, SongSections } from "@/lib/types/mastering";

type NumericRule = readonly [min: number, max: number];

const NUMERIC_RULES: Record<Exclude<keyof AnalysisData, "key" | "clipping_detected" | "analysis_token" | "bass_correlation" | "bass_side_ratio" | "tonal_profile" | "sections">, NumericRule> = {
  integrated_lufs: [-100, 10], true_peak: [-160, 20], dr_value: [0, 60],
  crest_factor: [0, 80], lra: [0, 80], rms_sub: [-160, 20], rms_low: [-160, 20],
  rms_mid: [-160, 20], rms_high: [-160, 20], rms_air: [-160, 20],
  spectral_centroid: [0, 100000], spectral_rolloff: [0, 100000],
  spectral_flatness: [0, 1], stereo_width: [0, 20], mono_compatibility: [-1, 1],
  bpm: [0, 400], transient_density: [0, 100], dc_offset: [-1, 1],
  duration_seconds: [0, 24 * 60 * 60], sample_rate: [4000, 768000],
  bit_depth: [0, 64], channels: [1, 32],
};
const OPTIONAL_RULES: Record<string, NumericRule> = { bass_correlation: [-1, 1], bass_side_ratio: [0, 20] };

export function normalizeTonalProfile(value: unknown): AnalysisData["tonal_profile"] | null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const p=value as Record<string,unknown>;
  if(p.version!==1||!Array.isArray(p.bands)||p.bands.length!==24||p.bands.filter(v=>v!==null).length<6||!p.bands.every(v=>v===null||(typeof v==="number"&&Number.isFinite(v)&&v>=-100&&v<=40))||typeof p.active_fraction!=="number"||!Number.isFinite(p.active_fraction)||p.active_fraction<=0||p.active_fraction>1)return null;
  return {version:1,bands:p.bands.slice(),active_fraction:p.active_fraction};
}

export function normalizeSongSections(value:unknown):SongSections|null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const p=value as Record<string,unknown>;
  if(p.version!==1||typeof p.duration!=="number"||!Number.isFinite(p.duration)||p.duration<=0||p.duration>86400||!Array.isArray(p.segments)||!p.segments.length||p.segments.length>64)return null;
  const segments:SongSections['segments']=[];let last=0;
  for(const raw of p.segments){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
    const s=raw as Record<string,unknown>;
    if(!['quiet','steady','dense'].includes(String(s.kind))||!['start','end','level_db','crest_db'].every(k=>typeof s[k]==="number"&&Number.isFinite(s[k])))return null;
    const {start,end,level_db,crest_db}=s as {start:number;end:number;level_db:number;crest_db:number};
    if(Math.abs(start-last)>.001||start<0||end<=start||end>p.duration+.001||level_db< -100||level_db>100||crest_db<0||crest_db>60)return null;
    segments.push({start,end,kind:s.kind as 'quiet'|'steady'|'dense',level_db,crest_db});last=end;
  }
  return Math.abs(last-p.duration)>.001?null:{version:1,duration:p.duration,segments};
}

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
  for (const [key, [min, max]] of Object.entries(OPTIONAL_RULES)) {
    if (input[key] === undefined) continue;
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
    output[key] = value;
  }
  if(input.tonal_profile!==undefined){const profile=normalizeTonalProfile(input.tonal_profile);if(!profile)return null;output.tonal_profile=profile;}
  if(input.sections!==undefined){const sections=normalizeSongSections(input.sections);if(!sections||Math.abs(sections.duration-Number(output.duration_seconds))>.02)return null;output.sections=sections;}
  return output as unknown as AnalysisData;
}

function canonicalAnalysis(analysis: AnalysisData): string {
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(NUMERIC_RULES)) ordered[key] = analysis[key as keyof AnalysisData];
  ordered.key = analysis.key;
  ordered.clipping_detected = analysis.clipping_detected;
  for (const key of Object.keys(OPTIONAL_RULES)) {
    if (analysis[key as keyof AnalysisData] !== undefined) ordered[key] = analysis[key as keyof AnalysisData];
  }
  if(analysis.tonal_profile!==undefined)ordered.tonal_profile=normalizeTonalProfile(analysis.tonal_profile);
  if(analysis.sections!==undefined)ordered.sections=normalizeSongSections(analysis.sections);
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

export function normalizeReferenceAnalysis(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if(input.references!==undefined){
    if(!Array.isArray(input.references)||input.references.length<1||input.references.length>3||!Array.isArray(input.weights)||input.weights.length!==input.references.length||!input.weights.every(w=>typeof w==="number"&&Number.isFinite(w)&&w>=0&&w<=100)||!input.weights.some(w=>w>0))return null;
    const references=input.references.map(r=>r&&typeof r==="object"&&!Array.isArray(r)&&!("references"in r)?normalizeReferenceAnalysis(r):null);
    if(references.some(r=>!r)||!input.settings||typeof input.settings!=="object"||Array.isArray(input.settings))return null;
    const raw=input.settings as Record<string,unknown>,settings:Record<string,number>={};
    for(const [key,lo,hi] of [["amount",0,1],["bass",-1,1],["brightness",-1,1],["smoothing",0,1]] as const){const v=raw[key];if(typeof v!=="number"||!Number.isFinite(v)||v<lo||v>hi)return null;settings[key]=v;}
    return {references,weights:input.weights.slice(),settings};
  }
  const rules: Record<string, NumericRule> = {
    integrated_lufs: [-100, 10], true_peak: [-160, 20],
    spectral_centroid: [0, 100000], spectral_rolloff: [0, 100000],
    spectral_flatness: [0, 1], rms_sub: [-160, 20], rms_low: [-160, 20],
    rms_mid: [-160, 20], rms_high: [-160, 20], rms_air: [-160, 20],
    stereo_width: [0, 20], mono_compatibility: [-1, 1],
    crest_factor: [0, 80], lra: [0, 80], transient_density: [0, 100],
  };
  const output: Record<string, unknown> = {};
  for (const [key, [min, max]] of Object.entries(rules)) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
    output[key] = value;
  }
  if(input.tonal_profile!==undefined){const profile=normalizeTonalProfile(input.tonal_profile);if(!profile)return null;output.tonal_profile=profile;}
  return typeof output.spectral_centroid === "number" && typeof output.rms_sub === "number" ? output : null;
}
