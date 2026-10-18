import type { AnalysisData, Lang } from "./types/mastering";

export const TOOL_AUDIO_ACCEPT = ".wav,.flac,.mp3,.aiff,.aif,audio/wav,audio/flac,audio/mpeg,audio/aiff";
const messages: Record<string, [string,string]> = {
  CUT_RANGE: ["Bitte mindestens 0,05 Sekunden auswählen; die Datei muss mindestens 0,1 Sekunden lang sein.", "Select at least 0.05 seconds; the file must be at least 0.1 seconds long."],
  CUT_FADE: ["Ein- und Ausblendung müssen zwischen 0 und 5 Sekunden liegen.", "Fade-in and fade-out must be between 0 and 5 seconds."],
  SIZE: ["Die Datei ist leer oder zu groß. Maximal 40 MB für die Serveranalyse.", "The file is empty or too large. Server analysis supports up to 40 MB."],
  LOCAL_SIZE: ["Die Datei ist leer oder zu groß. Die lokale Verarbeitung unterstützt bis zu 80 MB.", "The file is empty or too large. Local processing supports up to 80 MB."],
  CHANNELS: ["Bitte eine Mono- oder Stereo-Datei verwenden. Mehrkanal-Audio wird nicht unterstützt.", "Please use mono or stereo audio. Multichannel audio is not supported."],
  DURATION: ["Die Serveranalyse unterstützt Tracks bis zu 10 Minuten.", "Server analysis supports tracks up to 10 minutes."],
  FORMAT: ["Bitte WAV, FLAC, MP3 oder AIFF verwenden.", "Please use WAV, FLAC, MP3 or AIFF."],
  OVERLOAD: ["Der Ausgang übersteuert. Pegel senken oder einen geschützten Export wählen.", "The output overloads. Reduce gain or choose a protected export."],
  NO_SIGNAL: ["Kein ausreichend lautes Signal gefunden. Datei und Stille-Schwelle prüfen.", "No sufficiently strong signal found. Check the file and silence threshold."],
  NO_BASS: ["Für den Vergleich fehlt ausreichend Tieftonenergie in mindestens einer Spur.", "At least one track has insufficient low-frequency energy for comparison."],
  WORKLET: ["Dieser Browser unterstützt die benötigte Audioverarbeitung nicht. Bitte einen aktuellen Browser verwenden.", "This browser does not support the required audio processing. Please use an up-to-date browser."],
  MEMORY: ["Die Verarbeitung würde zu viel Arbeitsspeicher benötigen. Kürzere Datei oder niedrigere Sample-Rate wählen.", "Processing would need too much memory. Choose a shorter file or lower sample rate."],
  BUSY: ["Der Audiodienst ist ausgelastet. Bitte kurz warten und erneut versuchen.", "The audio service is busy. Please wait briefly and try again."],
  LIMIT: ["Das Analyse-Limit ist erreicht. Bitte später erneut versuchen.", "The analysis limit has been reached. Please try again later."],
  TIMEOUT: ["Die Verarbeitung hat zu lange gedauert. Bitte erneut versuchen.", "Processing took too long. Please try again."],
  DECODE: ["Die Datei konnte nicht gelesen werden. Bitte eine gültige Audiodatei verwenden.", "The file could not be decoded. Please use a valid audio file."],
  ANALYSIS: ["Die Audioanalyse ist fehlgeschlagen. Bitte erneut versuchen.", "Audio analysis failed. Please try again."],
};
export function toolError(error: unknown, lang: Lang) {
  const raw = error instanceof Error ? error.message : "ANALYSIS";
  const code = error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : raw.includes("budget") ? "MEMORY" : raw.includes("mono and stereo") ? "CHANNELS" : raw.includes("Workers") ? "WORKLET" : raw;
  return messages[code]?.[lang === "en" ? 1 : 0] ?? (lang === "en" ? "Processing failed. Please try another audio file." : "Verarbeitung fehlgeschlagen. Bitte eine andere Audiodatei versuchen.");
}
export function validateToolFile(file: File, maxBytes = 40 * 1024 * 1024) {
  if (!file.size || file.size > maxBytes) throw Error("SIZE");
  if (!/\.(wav|flac|mp3|aiff|aif)$/i.test(file.name)) throw Error("FORMAT");
}
export function responseError(response: Response) {
  return Error(response.status === 429 ? "LIMIT" : response.status === 413 ? "SIZE" : response.status === 415 ? "DECODE" : response.status === 503 ? "BUSY" : response.status === 504 ? "TIMEOUT" : "ANALYSIS");
}
const analysisCache = new WeakMap<File, AnalysisData>();
/** Session-only cache: no files or measurements are persisted/shared. */
export async function requestToolAnalysis(file: File, purpose: string, lang: Lang, signal: AbortSignal): Promise<AnalysisData> {
  validateToolFile(file); signal.throwIfAborted();
  const cached = analysisCache.get(file); if (cached) return cached;
  const body = new FormData(); body.append("file", file); body.append("purpose", purpose); body.append("lang", lang);
  const response = await fetch("/api/mix-check", {method:"POST",body,signal:AbortSignal.any([signal,AbortSignal.timeout(175000)])});
  if (!response.ok) {const payload=await response.json().catch(()=>({}));throw typeof payload.code==="string"&&messages[payload.code]?Error(payload.code):responseError(response);}
  const payload = await response.json(); signal.throwIfAborted();
  if (!payload.analysis || !Number.isFinite(payload.analysis.integrated_lufs)) throw Error("ANALYSIS");
  analysisCache.set(file, payload.analysis); return payload.analysis;
}

export function median(values: number[]) {
  const sorted = [...values].sort((a,b)=>a-b), mid = Math.floor(sorted.length/2);
  return sorted.length ? sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2 : 0;
}
export function tapTempo(times: number[]) {
  const intervals = times.slice(1).map((t,i)=>t-times[i]).filter(v=>v>=150&&v<=2000);
  if (!intervals.length) return 0;
  const center = median(intervals), stable = intervals.filter(v=>Math.abs(v-center)<=center*.3);
  return stable.length ? 60000 / (stable.reduce((s,v)=>s+v,0)/stable.length) : 0;
}
