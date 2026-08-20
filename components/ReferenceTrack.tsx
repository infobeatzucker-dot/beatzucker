"use client";

/**
 * ReferenceTrack — Upload a professional reference track.
 * The app will AI-match loudness, tonal balance and dynamics to it.
 * Users can also save reference analyses to their library and reload
 * them later without re-uploading the audio file.
 */

import { useRef, useState, useEffect } from "react";
import { SlidersHorizontal, Save, BarChart3, Library } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

export interface ReferenceAnalysis {
  integrated_lufs:   number;
  true_peak:         number;
  spectral_centroid: number;
  spectral_rolloff:  number;
  spectral_flatness: number;
  rms_sub: number; rms_low: number; rms_mid: number; rms_high: number; rms_air: number;
  stereo_width?: number;
  mono_compatibility?: number;
  lra?: number;
  crest_factor?: number;
  transient_density?: number;
}

export interface SavedRef {
  id: string;
  name: string;
  analysisJson: string;
  createdAt: string;
}

interface Props {
  onReference: (analysis: ReferenceAnalysis | null, filename: string | null) => void;
  canSaveRefs?: boolean;
  refLimit?: number;
  savedRefs?: SavedRef[];
  onSaveRef?: (analysis: ReferenceAnalysis, name: string) => Promise<void>;
  onDeleteRef?: (id: string) => Promise<void>;
  lang?: Lang;
}

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ── Reference Popup ──────────────────────────────────────────────────────────

function ReferencePopup({
  analysis,
  filename,
  canSave,
  onClose,
  onSave,
  lang,
}: {
  analysis: ReferenceAnalysis;
  filename: string;
  canSave?: boolean;
  onClose: () => void;
  onSave?: () => Promise<void>;
  lang: Lang;
}) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const bands = [
    { label: "Sub",  range: "20–80 Hz",    value: analysis.rms_sub,  color: "#a855f7" },
    { label: "Low",  range: "80–500 Hz",   value: analysis.rms_low,  color: "#38bdf8" },
    { label: "Mid",  range: "500–5k Hz",   value: analysis.rms_mid,  color: "#3b82f6" },
    { label: "High", range: "5–12k Hz",    value: analysis.rms_high, color: "#f59e0b" },
    { label: "Air",  range: "12–20k Hz",   value: analysis.rms_air,  color: "#ec4899" },
  ];
  const toBar = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 54) * 100));

  async function handleSave() {
    if (!onSave) return;
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "480px",
          background: "linear-gradient(160deg, rgba(18,22,30,0.98) 0%, rgba(12,16,24,0.98) 100%)",
          border: "1px solid rgba(196,181,253,0.3)", borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
          animation: "popUp 0.22s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1rem 1.25rem 0.875rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(196,181,253,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <SlidersHorizontal size={17} strokeWidth={2} color="var(--accent-gold)" />
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--accent-gold)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                {lang === "de" ? "Referenz-Analyse" : "Reference analysis"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.1rem", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {filename}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: "28px", height: "28px", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
            color: "var(--text-muted)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
          }}>✕</button>
        </div>

        {/* Metrics */}
        <div style={{ padding: "1.1rem 1.25rem 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem", marginBottom: "1.1rem" }}>
            {[
              { label: lang === "de" ? "Integriert" : "Integrated", value: `${analysis.integrated_lufs.toFixed(1)} LUFS`, color: "var(--accent-purple)" },
              { label: "True Peak",   value: `${analysis.true_peak.toFixed(1)} dBTP`,        color: "var(--accent-cyan)" },
              { label: lang === "de" ? "Schwerpunkt" : "Centroid", value: `${Math.round(analysis.spectral_centroid)} Hz`, color: "#f59e0b" },
              { label: "Rolloff",     value: `${Math.round(analysis.spectral_rolloff)} Hz`,   color: "var(--accent-cyan)" },
              { label: lang === "de" ? "Flachheit" : "Flatness", value: analysis.spectral_flatness.toFixed(3), color: "var(--accent-purple)" },
            ].map((m) => (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px", padding: "0.65rem 0.75rem",
              }}>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  {m.label}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: m.color, fontVariantNumeric: "tabular-nums" }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Band bars */}
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "10px", padding: "0.875rem", marginBottom: "1.1rem",
          }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem", fontWeight: 600 }}>
              {lang === "de" ? "Frequenzband-Energie" : "Frequency band energy"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {bands.map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "30px", fontSize: "0.68rem", color: b.color, fontWeight: 600, flexShrink: 0 }}>{b.label}</div>
                  <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      width: `${toBar(b.value)}%`, height: "100%", borderRadius: "3px",
                      background: `linear-gradient(90deg, ${b.color}99, ${b.color})`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <div style={{ width: "52px", textAlign: "right", fontSize: "0.68rem", color: "var(--text-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {b.value.toFixed(1)} dB
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.75rem 1.25rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
        }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {lang === "de" ? "KI gleicht Lautheit · Spektrum · Dynamik ab" : "AI matches loudness · spectrum · dynamics"}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {canSave && (
              <button
                onClick={handleSave}
                disabled={saveState === "saving" || saveState === "saved"}
                style={{
                  padding: "0.4rem 0.9rem", borderRadius: "7px",
                  background: saveState === "saved"
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(139,92,246,0.12)",
                  border: `1px solid ${saveState === "saved" ? "rgba(16,185,129,0.4)" : "rgba(139,92,246,0.3)"}`,
                  color: saveState === "saved" ? "#10b981" : "var(--accent-purple)",
                  fontSize: "0.78rem", fontWeight: 600, cursor: saveState === "saving" || saveState === "saved" ? "default" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {saveState === "saving" ? "…" : saveState === "saved" ? (lang === "de" ? "✓ Gespeichert" : "✓ Saved") : saveState === "error" ? (lang === "de" ? "Fehler" : "Error") : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <Save size={12} strokeWidth={2} /> {lang === "de" ? "Speichern" : "Save"}
                  </span>
                )}
              </button>
            )}
            <button onClick={onClose} style={{
              padding: "0.4rem 1rem", borderRadius: "7px",
              background: "rgba(196,181,253,0.12)", border: "1px solid rgba(196,181,253,0.3)",
              color: "var(--accent-gold)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
            }}>OK</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popUp  { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReferenceTrack({
  onReference,
  canSaveRefs = true,
  refLimit = 100,
  savedRefs = [],
  onSaveRef,
  onDeleteRef,
  lang = "de",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename]         = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [popupData, setPopupData]       = useState<{ analysis: ReferenceAnalysis; filename: string } | null>(null);
  const [fromLibrary, setFromLibrary]   = useState(false); // true when loaded from saved refs

  // Progress tracking
  const [phase, setPhase]       = useState<"idle" | "upload" | "analyze">("idle");
  const [uploadPct, setUploadPct]   = useState(0);
  const [analyzePct, setAnalyzePct] = useState(0);

  // Library view toggle (only when canSaveRefs && savedRefs.length > 0)
  const [view, setView] = useState<"upload" | "library">("upload");

  // Reset to upload view if savedRefs becomes empty
  useEffect(() => {
    if (savedRefs.length === 0) setView("upload");
  }, [savedRefs.length]);

  const handleFile = async (file: File) => {
    setError(null);
    setPhase("upload");
    setUploadPct(0);
    setAnalyzePct(0);
    setFromLibrary(false);

    try {
      const form = new FormData();
      form.append("file", file);
      const { file_id, upload_token } = await new Promise<{ file_id: string; upload_token: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
          else reject(new Error(lang === "de" ? "Upload fehlgeschlagen" : "Upload failed"));
        };
        xhr.onerror = () => reject(new Error(lang === "de" ? "Netzwerkfehler" : "Network error"));
        xhr.open("POST", "/api/upload");
        xhr.send(form);
      });
      setUploadPct(100);

      setPhase("analyze");
      const analyzeTimer = setInterval(() => {
        setAnalyzePct((p) => (p < 88 ? p + (88 - p) * 0.14 : p));
      }, 250);

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id, upload_token }),
      });
      clearInterval(analyzeTimer);
      if (!analyzeRes.ok) throw new Error(lang === "de" ? "Analyse fehlgeschlagen" : "Analysis failed");
      setAnalyzePct(100);

      const analysis: ReferenceAnalysis = await analyzeRes.json();
      setPhase("idle");
      setFilename(file.name);
      setLastAnalysis(analysis);
      setPopupData({ analysis, filename: file.name });
      onReference(analysis, file.name);
    } catch (e) {
      setError(lang === "de" ? "Referenztrack konnte nicht analysiert werden" : "Reference track could not be analyzed");
      setPhase("idle");
      console.warn(e);
    }
  };

  const handleClear = () => {
    setFilename(null);
    setError(null);
    setPopupData(null);
    setLastAnalysis(null);
    setFromLibrary(false);
    onReference(null, null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleLoadSavedRef = (ref: SavedRef) => {
    try {
      const analysis: ReferenceAnalysis = JSON.parse(ref.analysisJson);
      setFilename(ref.name);
      setLastAnalysis(analysis);
      setFromLibrary(true);
      setPopupData(null);
      setError(null);
      setView("upload");
      onReference(analysis, ref.name);
    } catch {
      setError(lang === "de" ? "Referenzdaten konnten nicht geladen werden" : "Reference data could not be loaded");
    }
  };

  const handleSaveToLib = async () => {
    if (!lastAnalysis || !filename || !onSaveRef) return;
    await onSaveRef(lastAnalysis, filename);
  };

  // colours for from-library indicator
  const libColor = "var(--accent-purple)";
  const libBorder = "rgba(139,92,246,0.3)";
  const libBg = "rgba(139,92,246,0.08)";

  const showLibTab = canSaveRefs && savedRefs.length > 0;

  return (
    <>
      {popupData && (
        <ReferencePopup
          analysis={popupData.analysis}
          filename={popupData.filename}
          canSave={canSaveRefs && !!onSaveRef}
          onClose={() => setPopupData(null)}
          onSave={handleSaveToLib}
          lang={lang}
        />
      )}

      <div className="glass-panel p-3" style={{ border: "1px solid rgba(196,181,253,0.15)" }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="label">{lang === "de" ? "Referenztrack" : "Reference track"}</span>
            {canSaveRefs && (
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                {savedRefs.length}/{refLimit}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {filename && (
              <button
                onClick={() => lastAnalysis && setPopupData({ analysis: lastAnalysis, filename: filename! })}
                className="transition-opacity hover:opacity-70 flex items-center"
                style={{ color: "var(--accent-gold)" }}
                title={lang === "de" ? "Analyse anzeigen" : "Show analysis"}
              ><BarChart3 size={13} strokeWidth={2} /></button>
            )}
            {filename && (
              <button onClick={handleClear} className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                ✕ {lang === "de" ? "Entfernen" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher (only when library has entries) */}
        {!filename && showLibTab && phase === "idle" && (
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
            {(["upload", "library"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  flex: 1, padding: "0.3rem 0", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: view === v ? "rgba(196,181,253,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${view === v ? "rgba(196,181,253,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: view === v ? "var(--accent-gold)" : "var(--text-muted)",
                }}
              >
                {v === "upload" ? "↑ Upload" : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <Library size={12} strokeWidth={2} /> {lang === "de" ? "Bibliothek" : "Library"}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Active reference (from upload or library) ── */}
        {filename ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
            background: fromLibrary ? libBg : "rgba(196,181,253,0.08)",
            border: `1px solid ${fromLibrary ? libBorder : "rgba(196,181,253,0.25)"}`,
          }}>
            {fromLibrary ? (
              <Library size={12} strokeWidth={2} color={libColor} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
            <span className="text-xs font-medium truncate" style={{ color: fromLibrary ? libColor : "var(--accent-gold)" }}>
              {filename}
            </span>
            <span className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              {lang === "de" ? (fromLibrary ? "Bibliothek · KI gleicht daran ab" : "KI gleicht daran ab") : (fromLibrary ? "Library · AI matches this" : "AI matches this")}
            </span>
          </div>

        /* ── Progress ────────────────────────────────── */
        ) : phase !== "idle" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", padding: "0.25rem 0" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.07em", color: phase === "upload" ? "var(--accent-gold)" : "var(--text-muted)" }}>
                  {phase !== "upload" && <span style={{ color: "var(--accent-cyan)", marginRight: "0.25rem" }}>✓</span>}UPLOAD
                </span>
                <span style={{ fontSize: "0.65rem", color: "var(--accent-gold)", fontVariantNumeric: "tabular-nums" }}>{uploadPct}%</span>
              </div>
              <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${uploadPct}%`, borderRadius: "2px", background: "linear-gradient(90deg, #c4b5fd, #60a5fa)", transition: "width 0.25s ease", boxShadow: phase === "upload" ? "0 0 6px rgba(196,181,253,0.5)" : "none" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.07em", color: phase === "analyze" ? "var(--accent-cyan)" : "var(--text-muted)" }}>{lang === "de" ? "ANALYSE" : "ANALYSIS"}</span>
                {phase === "analyze" && (
                  <span style={{ fontSize: "0.65rem", color: "var(--accent-cyan)", fontVariantNumeric: "tabular-nums" }}>{Math.round(analyzePct)}%</span>
                )}
              </div>
              <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${analyzePct}%`, borderRadius: "2px", background: "linear-gradient(90deg, var(--accent-cyan), #67e8f9)", transition: "width 0.35s ease", boxShadow: phase === "analyze" ? "0 0 6px rgba(56,189,248,0.5)" : "none" }} />
              </div>
            </div>
          </div>

        /* ── Library view ────────────────────────────── */
        ) : view === "library" && showLibTab ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "160px", overflowY: "auto" }}>
            {savedRefs.map((ref) => (
              <div key={ref.id} style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.4rem 0.6rem", borderRadius: "7px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", flexShrink: 0 }}>{fmtDate(ref.createdAt, lang)}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ref.name}
                </span>
                <button
                  onClick={() => handleLoadSavedRef(ref)}
                  style={{
                    padding: "0.2rem 0.55rem", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 600,
                    background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
                    color: "var(--accent-purple)", cursor: "pointer", flexShrink: 0,
                  }}
                >{lang === "de" ? "Laden" : "Load"}</button>
                {onDeleteRef && (
                  <button
                    onClick={() => onDeleteRef(ref.id)}
                    style={{
                      width: "20px", height: "20px", borderRadius: "4px", fontSize: "0.65rem",
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171", cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    title={lang === "de" ? "Löschen" : "Delete"}
                  >✕</button>
                )}
              </div>
            ))}
          </div>

        /* ── Upload button ───────────────────────────── */
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
            style={{ background: "rgba(196,181,253,0.06)", border: "1px dashed rgba(196,181,253,0.3)", color: "var(--accent-gold)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {lang === "de" ? "Referenz hochladen (WAV / MP3)" : "Upload reference (WAV / MP3)"}
          </button>
        )}

        {error && <p className="text-xs mt-1.5" style={{ color: "var(--accent-red)" }}>{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept=".wav,.mp3,.flac,.aiff,.aif,.m4a,.ogg"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    </>
  );
}
