"use client";

import { useState, useRef, useCallback } from "react";
import { AppState, AnalysisData, UploadedFile, type Lang } from "@/lib/types/mastering";

interface Props {
  onUploadComplete: (file: UploadedFile) => void;
  onAnalysisComplete: (data: AnalysisData) => void;
  setAppState: (state: AppState) => void;
  uploadedFile: UploadedFile | null;
  isAuthenticated?: boolean;
  onSignInClick?: () => void;
  lang?: Lang;
}

const ACCEPTED_FORMATS = [".wav", ".flac", ".mp3", ".aiff", ".ogg", ".m4a"];
const MAX_SIZE_MB = 200;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Pre-computed waveform heights to avoid SSR/client hydration mismatch
const WAVEFORM_BARS = Array.from({ length: 40 }, (_, i) => ({
  delay: `${((i * 0.05) % 1.2).toFixed(2)}s`,
  height: `${(20 + Math.sin(i * 0.5) * 15).toFixed(2)}%`,
  duration: `${(0.8 + (i % 5) * 0.1).toFixed(1)}s`,
}));

// Idle waveform animation bars
function IdleWaveform() {
  return (
    <div className="hero-waveform flex items-end justify-center gap-0.5 h-12 mb-4" aria-hidden="true">
      {WAVEFORM_BARS.map((bar, i) => (
        <div
          key={i}
          className="waveform-idle-bar rounded-sm"
          style={{
            width: "3px",
            height: bar.height,
            background: "linear-gradient(180deg, #ee45d7 0%, #8261ff 52%, #49c8ff 100%)",
            animationDelay: bar.delay,
            animationDuration: bar.duration,
          }}
        />
      ))}
    </div>
  );
}

export default function UploadZone({
  onUploadComplete,
  onAnalysisComplete,
  setAppState,
  uploadedFile,
  isAuthenticated = false,
  onSignInClick,
  lang = "de",
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
    setCurrentFilename(file.name);

      // Validate
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_FORMATS.includes(ext)) {
        setError(lang === "de" ? `Nicht unterstütztes Format. Erlaubt: ${ACCEPTED_FORMATS.join(", ")}` : `Unsupported format. Accepted: ${ACCEPTED_FORMATS.join(", ")}`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(lang === "de" ? `Datei zu groß. Maximum: ${MAX_SIZE_MB} MB` : `File too large. Maximum: ${MAX_SIZE_MB} MB`);
        return;
      }

      // Upload
      setIsUploading(true);
      setUploadProgress(0);
      setAppState("uploaded");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        const uploadResult = await new Promise<UploadedFile>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(JSON.parse(xhr.responseText)?.error || (lang === "de" ? "Upload fehlgeschlagen" : "Upload failed")));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });

        setIsUploading(false);
        onUploadComplete(uploadResult);

        // Auto-analyze
        setIsAnalyzing(true);
        setAnalyzeProgress(0);
        setAppState("analyzing");

        // Simulate analysis progress (real progress unavailable from API)
        const analyzeTimer = setInterval(() => {
          setAnalyzeProgress((p) => (p < 88 ? p + (88 - p) * 0.12 : p));
        }, 300);

        const analysisRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: uploadResult.file_id,
            upload_token: uploadResult.upload_token,
          }),
        });

        clearInterval(analyzeTimer);

        if (!analysisRes.ok) {
          const err = await analysisRes.json();
          throw new Error(err.error || (lang === "de" ? "Analyse fehlgeschlagen" : "Analysis failed"));
        }

        setAnalyzeProgress(100);
        const analysisData: AnalysisData = await analysisRes.json();
        setIsAnalyzing(false);
        onAnalysisComplete(analysisData);
      } catch (err: unknown) {
        setIsUploading(false);
        setIsAnalyzing(false);
        setError(err instanceof Error ? err.message : (lang === "de" ? "Upload fehlgeschlagen" : "Upload failed"));
        setAppState("idle");
      }
    },
    [onUploadComplete, onAnalysisComplete, setAppState, lang]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (isUploading || isAnalyzing) {
    return (
      <div className="upload-zone p-6" style={{ minHeight: 200 }}>
        <div className="flex flex-col gap-5 justify-center h-full" style={{ minHeight: 160 }}>

          {/* Filename */}
          {currentFilename && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M9 18V5l12-2v13" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="6" cy="18" r="3" stroke="var(--accent-purple)" strokeWidth="1.5"/>
                <circle cx="18" cy="16" r="3" stroke="var(--accent-purple)" strokeWidth="1.5"/>
              </svg>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentFilename}
              </span>
            </div>
          )}

          {/* Upload bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: isUploading ? "var(--accent-purple)" : "var(--text-muted)",
                display: "flex", alignItems: "center", gap: "0.35rem",
              }}>
                {isUploading && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--accent-purple)", boxShadow: "0 0 6px var(--accent-purple)", animation: "pulse 1s infinite" }} />}
                {!isUploading && <span style={{ color: "var(--accent-cyan)" }}>✓</span>}
                {lang === "de" ? "HOCHLADEN" : "UPLOAD"}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-purple)", fontVariantNumeric: "tabular-nums" }}>
                {isUploading ? `${uploadProgress}%` : "100%"}
              </span>
            </div>
            <div style={{ height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: isUploading ? `${uploadProgress}%` : "100%",
                background: isUploading
                  ? "linear-gradient(90deg, var(--accent-purple), #a78bfa)"
                  : "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))",
                borderRadius: "3px",
                transition: "width 0.25s ease",
                boxShadow: isUploading ? "0 0 8px rgba(139,92,246,0.5)" : "none",
              }} />
            </div>
          </div>

          {/* Analyse bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: isAnalyzing ? "var(--accent-cyan)" : "var(--text-muted)",
                display: "flex", alignItems: "center", gap: "0.35rem",
              }}>
                {isAnalyzing && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--accent-cyan)", boxShadow: "0 0 6px var(--accent-cyan)", animation: "pulse 1s infinite" }} />}
                {lang === "de" ? "ANALYSE" : "ANALYSIS"}
              </span>
              {isAnalyzing && (
                <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(analyzeProgress)}%
                </span>
              )}
            </div>
            <div style={{ height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              {isAnalyzing ? (
                <div style={{
                  height: "100%",
                  width: `${analyzeProgress}%`,
                  background: "linear-gradient(90deg, var(--accent-cyan), #67e8f9)",
                  borderRadius: "3px",
                  transition: "width 0.35s ease",
                  boxShadow: "0 0 8px rgba(56,189,248,0.5)",
                }} />
              ) : (
                <div style={{ height: "100%", width: "0%", background: "rgba(255,255,255,0.04)" }} />
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (uploadedFile && !isAnalyzing && !isUploading) {
    return (
      <div
        className="rounded-2xl p-5 flex items-center justify-between"
        style={{
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5l12-2v13" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="6" cy="18" r="3" stroke="var(--accent-purple)" strokeWidth="1.5"/>
              <circle cx="18" cy="16" r="3" stroke="var(--accent-purple)" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {uploadedFile.filename}
            </div>
            <div className="flex gap-3 mt-0.5">
              <span className="mono text-xs" style={{ color: "var(--accent-cyan)" }}>
                {formatDuration(uploadedFile.duration)}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatFileSize(uploadedFile.size)}
              </span>
              <span className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                {uploadedFile.format}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {lang === "de" ? "Ersetzen" : "Replace"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_FORMATS.join(",")}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    );
  }

  // Auth gate — not logged in
  if (!isAuthenticated) {
    return (
      <div
        className="upload-zone p-8 text-center"
        style={{ minHeight: 220 }}
        onDragOver={(e) => e.preventDefault()}
      >
        <IdleWaveform />
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid var(--border-subtle)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--accent-purple)" strokeWidth="1.5"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          {lang === "de" ? "Zum Hochladen anmelden" : "Sign in to upload"}
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          {lang === "de" ? "Erstelle ein kostenloses Konto und mastere deine Tracks." : "Create a free account and start mastering your tracks."}
        </p>
        <button
          onClick={() => onSignInClick?.()}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, var(--accent-purple), #5a4fd0)",
            color: "#fff",
          }}
        >
          {lang === "de" ? "Anmelden / Registrieren" : "Sign in / Register"}
        </button>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          {lang === "de" ? "100 % kostenlos · 10 Masterings pro Tag · Keine Kreditkarte erforderlich" : "100% free · 10 masters per day · No credit card required"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`upload-zone p-8 text-center cursor-pointer ${isDragging ? "drag-over" : ""}`}
      style={{ minHeight: 220 }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <IdleWaveform />

      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: isDragging
            ? "rgba(56,189,248,0.15)"
            : "rgba(139,92,246,0.1)",
          border: isDragging
            ? "1px solid var(--accent-cyan)"
            : "1px solid var(--border-subtle)",
          transition: "all 0.3s",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 16V8M9 11l3-3 3 3M20 16.7A5 5 0 0018 7h-1.26A8 8 0 104 15.25"
            stroke={isDragging ? "var(--accent-cyan)" : "var(--accent-purple)"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {isDragging ? (lang === "de" ? "Track hier ablegen" : "Drop your track here") : (lang === "de" ? "Track hochladen" : "Upload your track")}
      </h3>
      <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
        {lang === "de" ? "Per Drag-and-drop ablegen oder Datei auswählen" : "Drag and drop or click to browse"}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {ACCEPTED_FORMATS.map((fmt) => (
          <span
            key={fmt}
            className="mono text-xs px-2 py-0.5 rounded"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
            }}
          >
            {fmt.toUpperCase().slice(1)}
          </span>
        ))}
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {lang === "de" ? `Max. ${MAX_SIZE_MB} MB · Stereo oder Mono` : `Max. ${MAX_SIZE_MB} MB · Stereo or mono`}
      </p>

      {error && (
        <p className="mt-3 text-xs font-medium" style={{ color: "var(--accent-red)" }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_FORMATS.join(",")}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
