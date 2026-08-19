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
  onError: () => void;
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
  fileId, originalName, platform, targetLufs, preset, intensity, selectedFormat,
  analysis, referenceAnalysis, overrides, lang = "de", signal,
  onProgress, onComplete, onError,
}: RunMasteringArgs): Promise<void> {
  try {
    const response = await fetch("/api/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_id: fileId,
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
    if (!response.ok || !response.body) { onError(); return; }

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
        if (data.error) { onError(); return true; }
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
    onError();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    onError();
  }
}
