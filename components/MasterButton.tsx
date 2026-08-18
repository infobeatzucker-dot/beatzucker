"use client";

import { useEffect, useRef } from "react";
import { Platform, Preset, MasterData, ProgressStep, AnalysisData, type Lang } from "@/lib/types/mastering";

interface Props {
  fileId: string;
  originalName?: string;      // original filename for mastering history
  platform: Platform;
  preset: Preset;
  intensity: number;          // 0–100
  selectedFormat: string;
  analysis?: AnalysisData;          // pre-computed analysis — passed to Python to skip librosa re-run
  referenceAnalysis?: AnalysisData; // optional reference track analysis for reference mastering
  isProcessing: boolean;
  onStart: () => void;
  onProgress: (step: ProgressStep) => void;
  onComplete: (data: MasterData) => void;
  onError: () => void;
  compact?: boolean;          // compact layout for sticky popup (no hint text, smaller button)
  downloadWindow?: "24h"; // shown as reminder below the button
  lang?: Lang;
}

const STEP_LABELS: Record<string, string> = {
  analyzing:   "Track wird analysiert…",
  eq:          "EQ-Korrektur wird angewendet…",
  compression: "Multiband-Kompression…",
  ms:          "M/S-Bearbeitung…",
  saturation:  "Harmonische Sättigung…",
  limiting:    "True-Peak-Limiting…",
  rendering:   "Formate werden gerendert…",
  complete:    "Mastering abgeschlossen!",
};

const STEP_LABELS_EN: Record<string, string> = {
  analyzing: "Analyzing track…", eq: "Applying EQ correction…", compression: "Multiband compression…",
  ms: "M/S processing…", saturation: "Harmonic saturation…", limiting: "True Peak limiting…",
  rendering: "Rendering all formats…", complete: "Mastering complete!",
};

export default function MasterButton({
  fileId, originalName, platform, preset, intensity, selectedFormat,
  analysis,
  referenceAnalysis,
  isProcessing, onStart, onProgress, onComplete, onError,
  compact = false,
  downloadWindow = "24h",
  lang = "de",
}: Props) {
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handleClickRef = useRef<() => void>(() => {});

  // Particles while processing
  useEffect(() => {
    if (!isProcessing || !particleContainerRef.current) return;
    const interval = setInterval(() => {
      const container = particleContainerRef.current;
      if (!container) return;
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = `${20 + Math.random() * 60}%`;
      particle.style.bottom = "0";
      particle.style.background = Math.random() > 0.5 ? "var(--accent-cyan)" : "var(--accent-purple)";
      const sz = `${2 + Math.random() * 4}px`;
      particle.style.width = sz; particle.style.height = sz;
      particle.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 1600);
    }, 150);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleClick = async () => {
    if (isProcessing) return;

    // Create controller BEFORE calling onStart() so the ref is set
    // before any state change (e.g. sticky popup unmounting) could
    // trigger the old cleanup and abort an in-flight request.
    const controller = new AbortController();
    abortRef.current = controller;

    onStart();

    try {
      const response = await fetch("/api/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, original_name: originalName, platform, preset, intensity, format: selectedFormat, analysis, reference_analysis: referenceAnalysis }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) { onError(); return; }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processChunk = (chunk: string): boolean => {
        const line = chunk.trim();
        if (!line.startsWith("data: ")) return false;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.step === "complete") { onComplete(data as MasterData); return true; }
          if (data.error)               { onError(); return true; }
          const labels = lang === "de" ? STEP_LABELS : STEP_LABELS_EN;
          onProgress({ step: data.step, label: labels[data.step] || data.label || data.step, progress: data.progress ?? 0 });
        } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[SSE] malformed chunk:", line, e); }
        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          if (buffer.trim()) for (const chunk of buffer.split("\n\n")) if (processChunk(chunk)) return;
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
  };

  // Keep ref in sync so keyboard shortcut can call latest version
  handleClickRef.current = handleClick;

  // ── Keyboard shortcut: M → master now ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "m" || e.key === "M") && !isProcessing) {
        handleClickRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isProcessing]);

  // NOTE: intentionally no unmount-abort cleanup here.
  // The controller is stored in abortRef so it outlives this component
  // instance (e.g. when the sticky popup unmounts after appState changes
  // to "mastering"). An abort on unmount would cancel the in-flight SSE
  // stream before Python has a chance to return results.

  return (
    <div className={`flex flex-col items-center gap-4 ${compact ? "" : "mt-6"}`}>
      <div className="relative overflow-hidden rounded-2xl" ref={compact ? undefined : particleContainerRef}>
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={`gradient-border relative ${compact ? "px-8 py-3" : "px-12 py-4"} rounded-2xl font-bold text-base tracking-wide transition-all duration-300
            ${isProcessing ? "opacity-80 cursor-wait" : "hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"}`}
          style={{
            background: isProcessing
              ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(56,189,248,0.3))"
              : "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
            color: "#fff", border: "none",
            boxShadow: isProcessing
              ? "0 0 40px rgba(139,92,246,0.4), 0 0 80px rgba(56,189,248,0.2)"
              : "0 0 20px rgba(139,92,246,0.3)",
            minWidth: compact ? 160 : 240,
          }}
        >
          {isProcessing ? (
            <span className="flex items-center gap-3 justify-center">
              <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: "rgba(255,255,255,0.8)", borderRightColor: "rgba(255,255,255,0.4)" }} />
              {lang === "de" ? "Mastering läuft…" : "Mastering…"}
            </span>
          ) : (
            <span className="flex items-center gap-2 justify-center">
              {lang === "de" ? "▶ JETZT MASTERN" : "▶ MASTER NOW"}
              {!compact && (
                <kbd className="text-xs px-1.5 py-0.5 rounded mono opacity-60"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 10 }}>
                  M
                </kbd>
              )}
            </span>
          )}
        </button>
      </div>

      {!isProcessing && !compact && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            {lang === "de" ? "Professionelle Mastering-Kette · KI-Parameterwahl · Format: " : "Professional mastering chain · AI parameter selection · Format: "}<span style={{ color: "var(--accent-cyan)" }}>{selectedFormat.toUpperCase()}</span>
          </p>
          <p className="text-xs text-center flex items-center gap-1" style={{ color: "rgba(196,181,253,0.75)" }}>
            <span>⏱</span>
            <span>{lang === "de" ? "Download-Fenster nach Fertigstellung:" : "Download window after completion:"} <strong>{downloadWindow}</strong></span>
          </p>
        </div>
      )}
    </div>
  );
}
