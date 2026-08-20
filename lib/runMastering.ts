import type {
  AnalysisData, Lang, MasterData, Platform, Preset, ProgressStep,
} from "@/lib/types/mastering";
import type { ParamValues } from "@/lib/masteringParams";

const STEP_LABELS: Record<string, string> = {
  analyzing:   "Track wird analysiert…",
  loading:     "Track wird geladen…",
  eq:          "EQ-Korrektur wird angewendet…",
  compression: "Multiband-Kompression…",
  ms:          "M/S-Bearbeitung…",
  saturation:  "Harmonische Sättigung…",
  limiting:    "True-Peak-Limiting…",
  rendering:   "Formate werden gerendert…",
  complete:    "Mastering abgeschlossen!",
};

const STEP_LABELS_EN: Record<string, string> = {
  analyzing: "Analyzing track…", loading: "Loading track…",
  eq: "Applying EQ correction…", compression: "Multiband compression…",
  ms: "M/S processing…", saturation: "Harmonic saturation…",
  limiting: "True Peak limiting…", rendering: "Rendering selected format…",
  complete: "Mastering complete!",
};

export interface RunMasteringArgs {
  fileId: string;
  uploadToken: string;
  originalName?: string;
  platform: Platform;
  targetLufs?: number;
  preset: Preset;
  intensity: number;
  selectedFormat: string;
  analysis?: AnalysisData;
  referenceAnalysis?: AnalysisData;
  overrides?: ParamValues;
  lang?: Lang;
  signal?: AbortSignal;
  onProgress: (step: ProgressStep) => void;
  onComplete: (data: MasterData) => void;
  onError: (message: string) => void;
}

/**
 * Startet einen Mastering-Lauf und verarbeitet den SSE-Fortschrittsstrom.
 *
 * Bewusst als eigenständige Funktion und nicht in MasterButton eingebettet:
 * die manuelle Nachjustierung startet ihre Läufe aus einem ganz anderen
 * Zustand heraus (der Button ist dann gar nicht gemountet). Zwei Kopien dieser
 * Stream-Logik wären eine Wartungsfalle — und zwei gemountete MasterButtons
 * würden den Tastatur-Shortcut doppelt registrieren.
 */
export async function runMastering({
  fileId, uploadToken, originalName, platform, targetLufs, preset, intensity, selectedFormat,
  analysis, referenceAnalysis, overrides, lang = "de", signal,
  onProgress, onComplete, onError,
}: RunMasteringArgs): Promise<void> {
  const fallbackError = lang === "de"
    ? "Das Mastering konnte nicht abgeschlossen werden. Deine Einstellungen bleiben erhalten – bitte versuche es erneut."
    : "Mastering could not be completed. Your settings are still available—please try again.";

  try {
    const response = await fetch("/api/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_id: fileId,
        upload_token: uploadToken,
        original_name: originalName,
        platform, preset, intensity,
        ...(platform === "custom" && Number.isFinite(targetLufs) ? { target_lufs: targetLufs } : {}),
        format: selectedFormat,
        analysis,
        reference_analysis: referenceAnalysis,
        ...(overrides && Object.keys(overrides).length > 0 ? { overrides } : {}),
      }),
      signal,
    });
    if (!response.ok) {
      let serverMessage = "";
      try {
        const body = await response.json() as { error?: unknown };
        if (typeof body.error === "string" && body.error.length <= 300) serverMessage = body.error;
      } catch { /* response was not JSON */ }
      const statusMessage = response.status === 401
        ? (lang === "de" ? "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an." : "Your session has expired. Please sign in again.")
        : response.status === 403
          ? (lang === "de" ? "Dieser Upload gehört nicht zu deiner aktuellen Sitzung. Bitte lade den Track erneut hoch." : "This upload does not belong to your current session. Please upload the track again.")
          : response.status === 429
            ? (lang === "de" ? (serverMessage || "Das Nutzungslimit ist erreicht. Bitte versuche es später erneut.") : "The usage limit has been reached. Please try again later.")
            : (lang === "de" ? serverMessage : "");
      onError(statusMessage || fallbackError);
      return;
    }
    if (!response.body) {
      onError(fallbackError);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const labels = lang === "de" ? STEP_LABELS : STEP_LABELS_EN;

    const processChunk = (chunk: string): boolean => {
      const line = chunk.trim();
      if (!line.startsWith("data: ")) return false;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.step === "complete") { onComplete(data as MasterData); return true; }
        if (data.error) {
          const message = lang === "de" && typeof data.error === "string" && data.error.length <= 300
            ? data.error : fallbackError;
          onError(message);
          return true;
        }
        onProgress({
          step: data.step,
          label: labels[data.step] || data.label || data.step,
          progress: data.progress ?? 0,
        });
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.warn("[SSE] malformed chunk:", line, e);
      }
      return false;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer.trim()) {
          for (const chunk of buffer.split("\n\n")) if (processChunk(chunk)) return;
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";
      for (const chunk of chunks) if (processChunk(chunk)) return;
    }
    onError(lang === "de"
      ? "Die Verbindung zum Mastering-Service wurde unerwartet beendet."
      : "The connection to the mastering service ended unexpectedly.");
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    onError(lang === "de"
      ? "Der Mastering-Service ist momentan nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut."
      : "The mastering service is currently unavailable. Please check your connection and try again.");
  }
}
