"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import AuthModal from "@/components/AuthModal";
import AnalysisPanel from "@/components/AnalysisPanel";
import MasterButton from "@/components/MasterButton";
import DownloadPanel from "@/components/DownloadPanel";
import ABPlayer from "@/components/ABPlayer";
import PlatformTargets from "@/components/PlatformTargets";
import PresetSelector from "@/components/PresetSelector";
import MasteringIntensity from "@/components/MasteringIntensity";
import ReferenceTrack, { type SavedRef, type ReferenceAnalysis as RefAnalysis } from "@/components/ReferenceTrack";
import MasteringProgressModal from "@/components/MasteringProgressModal";
import ManualAdjustModal from "@/components/ManualAdjustModal";
import type { ParamValues } from "@/lib/masteringParams";
import { runMastering } from "@/lib/runMastering";
import { AudioEngineProvider, useAudioEngine } from "@/contexts/AudioEngineContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DAILY_MASTER_LIMIT } from "@/lib/constants";
import type {
  AppState, Platform, Preset, AnalysisData, MasterData, UploadedFile, ProgressStep, Lang,
} from "@/lib/types/mastering";


// ── Auto-play master after mastering completes ─────────────────────────────────
// Must live inside AudioEngineProvider so it can access the audio engine hook.
function MasterPlayTrigger({ shouldPlay, downloadRef }: {
  shouldPlay: boolean;
  downloadRef: React.RefObject<HTMLDivElement | null>;
}) {
  const engine = useAudioEngine();
  const didTrigger = useRef(false);

  useEffect(() => {
    if (!shouldPlay) { didTrigger.current = false; return; }
    if (didTrigger.current || !engine?.masteredUrl) return;
    didTrigger.current = true;

    // Scroll to download/player panel
    setTimeout(() => {
      const el = downloadRef.current;
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    }, 400);

    // Switch to master + attempt autoplay (700ms delay for panel animation)
    setTimeout(() => engine.playMaster(), 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlay, engine?.masteredUrl]);

  return null;
}

const T = {
  free_limit: {
    de: (used: number, limit: number) => used >= limit
      ? `Tageslimit erreicht (${used}/${limit} Masterings heute).`
      : `${used} von ${limit} Masterings heute genutzt`,
    en: (used: number, limit: number) => used >= limit
      ? `Daily limit reached (${used}/${limit} masters today).`
      : `${used} of ${limit} masters used today`,
  },
  neue_datei: { de: "Neue Datei", en: "New File" },
  studio: { de: "Adaptives Mastering-Studio", en: "Adaptive mastering studio" },
  dashboard: { de: "Mastering-Dashboard", en: "Mastering dashboard" },
  ready: { de: "Bereit", en: "Ready" },
  analyzing: { de: "Track wird analysiert…", en: "Analyzing track…" },
  download_window: {
    de: () => `⏱ Nach Fertigstellung 24 Stunden zum Download verfügbar — danach automatische Löschung`,
    en: () => `⏱ Download available for 24 hours after completion — then automatically deleted`,
  },
};

const FORMAT_OPTIONS = [
  { key: "mp3128",  label: "MP3 128" },
  { key: "mp3320",  label: "MP3 320" },
  { key: "wav16",   label: "WAV 16-bit" },
  { key: "wav24",   label: "WAV 24-bit" },
  { key: "flac",    label: "FLAC" },
  { key: "aac256",  label: "AAC 256" },
  { key: "wav32",   label: "WAV 32-bit" },
] as const;

interface Props {
  lang: Lang;
}

export default function MasteringWorkspace({ lang }: Props) {
  const { data: session, status: sessionStatus } = useSession();
  const [dailyUsed, setDailyUsed] = useState<number | null>(null);
  const [appState,         setAppState]         = useState<AppState>("idle");
  const [uploadedFile,     setUploadedFile]     = useState<UploadedFile | null>(null);
  const [analysis,         setAnalysis]         = useState<AnalysisData | null>(null);
  const [masterData,       setMasterData]       = useState<MasterData | null>(null);
  const [platform,         setPlatform]         = useState<Platform>("spotify");
  const [customLufs,       setCustomLufs]       = useState<number>(-14);
  const [preset,           setPreset]           = useState<Preset>("auto");
  const [intensity,        setIntensity]        = useState<number>(65);
  const [currentProgress,  setCurrentProgress]  = useState<ProgressStep | null>(null);
  const [selectedFormat,   setSelectedFormat]   = useState<string>("mp3128");
  const [referenceAnalysis, setReferenceAnalysis] = useState<AnalysisData | null>(null);
  const [savedRefs, setSavedRefs] = useState<SavedRef[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [masteringError, setMasteringError] = useState<string | null>(null);
  const adjustReopenGuardRef = useRef(0);

  // Scroll targets
  const mainPanelRef  = useRef<HTMLDivElement>(null);
  const downloadRef   = useRef<HTMLDivElement>(null);  // scroll-to after mastering

  // Fetch today's usage count when authenticated
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/account")
      .then(r => r.json())
      .then(d => {
        if (typeof d.dailyUsed === "number") setDailyUsed(d.dailyUsed);
      })
      .catch(() => {});
  }, [sessionStatus, session?.user?.id]);

  // Fetch saved reference library
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/references")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.refs)) setSavedRefs(d.refs); })
      .catch(() => {});
  }, [sessionStatus]);

  const handleSaveRef = useCallback(async (analysis: RefAnalysis, name: string) => {
    const r = await fetch("/api/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, analysis }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Fehler beim Speichern");
    if (d.ref) setSavedRefs(prev => [d.ref, ...prev]);
  }, []);

  const handleDeleteRef = useCallback(async (id: string) => {
    await fetch(`/api/references?id=${id}`, { method: "DELETE" });
    setSavedRefs(prev => prev.filter(r => r.id !== id));
  }, []);

  // Guard: prevents stale handleMasteringComplete / handleMasteringError
  // callbacks from updating state after a reset or remaster.
  const isMasteringRef = useRef(false);

  const scrollToPanel = useCallback(() => {
    setTimeout(() => {
      const el = mainPanelRef.current;
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 50);
  }, []);

  const openManualAdjust = useCallback(() => {
    // Closing the fixed modal can expose its opener before the browser has
    // finished the same pointer sequence. Ignore that one click-through.
    if (Date.now() < adjustReopenGuardRef.current) return;
    setAdjustOpen(true);
  }, []);

  const closeManualAdjust = useCallback(() => {
    adjustReopenGuardRef.current = Date.now() + 500;
    setAdjustOpen(false);
  }, []);

  const handleUploadComplete   = useCallback((file: UploadedFile) => {
    setMasteringError(null);
    setUploadedFile(file);
    setAppState("uploaded");
  }, []);
  const handleAnalysisComplete = useCallback((data: AnalysisData) => { setAnalysis(data); setAppState("analyzed"); }, []);

  const handleMasteringStart = useCallback(() => {
    isMasteringRef.current = true;
    setMasteringError(null);
    setAppState("mastering");
    setCurrentProgress({ step: "analyzing", label: T.analyzing[lang], progress: 5 });
    // No scroll needed — progress is shown in a modal overlay
  }, [lang]);

  const handleProgressUpdate = useCallback((step: ProgressStep) => setCurrentProgress(step), []);

  const handleMasteringComplete = useCallback((data: MasterData) => {
    if (!isMasteringRef.current) return; // stale callback after reset/remaster — ignore
    isMasteringRef.current = false;
    setMasterData(data);
    setAppState("done");
    setCurrentProgress(null);
    setMasteringError(null);
    setDailyUsed((used) => used === null ? null : Math.min(DAILY_MASTER_LIMIT, used + 1));
  }, []);

  const handleMasteringError = useCallback((message: string) => {
    if (!isMasteringRef.current) return; // stale callback — ignore
    isMasteringRef.current = false;
    setAppState(masterData ? "done" : "analyzed");
    setCurrentProgress(null);
    setMasteringError(message);
  }, [masterData]);

  const handleReset = useCallback(() => {
    isMasteringRef.current = false; // cancel any in-flight mastering callbacks
    setAppState("idle");
    setUploadedFile(null);
    setAnalysis(null);
    setMasterData(null);
    setCurrentProgress(null);
    setMasteringError(null);
    scrollToPanel();
  }, [scrollToPanel]);

  // Remaster: keep file + analysis, just clear the master result
  const handleRemaster = useCallback(() => {
    isMasteringRef.current = false; // cancel any in-flight mastering callbacks
    setMasterData(null);
    setCurrentProgress(null);
    setMasteringError(null);
    setAppState("analyzed");
    scrollToPanel();
  }, [scrollToPanel]);

  /**
   * Übernimmt die manuell eingestellten Werte und rendert den Track damit neu.
   * Läuft direkt über runMastering(), weil der MasterButton im Zustand "done"
   * gar nicht gemountet ist — eine zweite Instanz nur zum Auslösen würde den
   * Tastatur-Shortcut doppelt registrieren.
   */
  const handleApplyAdjustments = useCallback(async (overrides: ParamValues) => {
    if (!uploadedFile) return;
    setAdjustOpen(false);
    handleMasteringStart();
    await runMastering({
      fileId: uploadedFile.file_id,
      uploadToken: uploadedFile.upload_token,
      originalName: uploadedFile.filename,
      platform, targetLufs: customLufs, preset, intensity,
      selectedFormat,
      analysis: analysis ?? undefined,
      referenceAnalysis: referenceAnalysis ?? undefined,
      overrides,
      lang,
      onProgress: handleProgressUpdate,
      onComplete: handleMasteringComplete,
      onError: handleMasteringError,
    });
  }, [uploadedFile, platform, customLufs, preset, intensity, selectedFormat, analysis,
      referenceAnalysis, lang, handleMasteringStart, handleProgressUpdate,
      handleMasteringComplete, handleMasteringError]);

  // Audio engine URLs
  const originalUrl = uploadedFile
    ? `/api/preview?file_id=${encodeURIComponent(uploadedFile.file_id)}&upload_token=${encodeURIComponent(uploadedFile.upload_token)}`
    : "";
  // Prefer the high-quality browser preview. MP3 128 remains a valid selected
  // delivery format, but should not be the default source for critical A/B.
  const masteredUrl = masterData?.formats.mp3320 || masterData?.formats.mp3128 || masterData?.formats.wav16 || "";

  return (
    <>
      <div ref={mainPanelRef}>
        <ErrorBoundary>
        <AudioEngineProvider
          originalUrl={originalUrl}
          masteredUrl={masteredUrl}
          originalLufs={analysis?.integrated_lufs}
          masteredLufs={masterData?.post_analysis.integrated_lufs}
        >
          <div
            className="mastering-dashboard glass-panel-elevated relative"
            style={{
              boxShadow: appState === "mastering"
                ? "0 0 40px rgba(139,92,246,0.2), 0 0 80px rgba(56,189,248,0.05)"
                : "0 4px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div className="dashboard-heading">
              <div>
                <span className="dashboard-kicker">{T.studio[lang]}</span>
                <h2>{T.dashboard[lang]}</h2>
              </div>
              <span className="ready-status"><i /> {T.ready[lang]}</span>
            </div>

            <AnimatePresence initial={false}>
              {masteringError && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem 0.85rem",
                    borderRadius: "10px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    color: "#fca5a5",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.65rem",
                    fontSize: "0.82rem",
                    lineHeight: 1.5,
                  }}
                >
                  <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{masteringError}</span>
                  <button
                    type="button"
                    onClick={() => setMasteringError(null)}
                    aria-label={lang === "de" ? "Fehlermeldung schließen" : "Dismiss error"}
                    style={{ color: "inherit", opacity: 0.8, padding: 2 }}
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Daily usage counter (fair-use limit, applies to everyone) */}
            {sessionStatus === "authenticated" && dailyUsed !== null && (
              <div style={{
                marginBottom: "1rem",
                padding: "0.55rem 0.9rem",
                borderRadius: "8px",
                background: dailyUsed >= DAILY_MASTER_LIMIT
                  ? "rgba(239,68,68,0.08)"
                  : dailyUsed >= DAILY_MASTER_LIMIT - 1
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(139,92,246,0.07)",
                border: `1px solid ${dailyUsed >= DAILY_MASTER_LIMIT ? "rgba(239,68,68,0.25)" : dailyUsed >= DAILY_MASTER_LIMIT - 1 ? "rgba(245,158,11,0.25)" : "rgba(139,92,246,0.2)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}>
                <span style={{ fontSize: "0.8rem", color: dailyUsed >= DAILY_MASTER_LIMIT ? "#f87171" : dailyUsed >= DAILY_MASTER_LIMIT - 1 ? "#fbbf24" : "var(--text-secondary)" }}>
                  {T.free_limit[lang](dailyUsed, DAILY_MASTER_LIMIT)}
                </span>
              </div>
            )}

            <div className={`dashboard-main-grid ${appState === "analyzed" || appState === "mastering" || appState === "done" ? "without-upload" : ""}`}>
              <div className="dashboard-control-card">
                <PlatformTargets value={platform} onChange={setPlatform} customLufs={customLufs} onCustomLufsChange={setCustomLufs} lang={lang} />
              </div>

              <AnimatePresence mode="wait">
                {(appState === "idle" || appState === "uploaded" || appState === "analyzing") && (
                  <motion.div
                    key="upload"
                    className="dashboard-upload-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <UploadZone
                      onUploadComplete={handleUploadComplete}
                      onAnalysisComplete={handleAnalysisComplete}
                      setAppState={setAppState}
                      uploadedFile={uploadedFile}
                      isAuthenticated={sessionStatus === "authenticated"}
                      onSignInClick={() => setAuthOpen(true)}
                      lang={lang}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="dashboard-control-card preset-card">
                <PresetSelector value={preset} onChange={setPreset} lang={lang} />
                {appState !== "idle" && (
                  <button type="button" onClick={handleReset} className="new-file-button">
                    <RotateCcw size={12} /> {T.neue_datei[lang]}
                  </button>
                )}
              </div>
            </div>

            <div className="dashboard-secondary-grid">
              <MasteringIntensity value={intensity} onChange={setIntensity} lang={lang} />
              <ReferenceTrack
                onReference={(a) => setReferenceAnalysis(a as AnalysisData | null)}
                savedRefs={savedRefs}
                onSaveRef={handleSaveRef}
                onDeleteRef={handleDeleteRef}
                lang={lang}
              />
            </div>

            {/* Player — shown after analysis (original only) */}
            <AnimatePresence>
              {appState === "analyzed" && uploadedFile && (
                <motion.div
                  key="player-pre"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <ABPlayer filename={uploadedFile.filename} lang={lang} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analysis / Visualizers */}
            <AnimatePresence>
              {(appState === "analyzed" || appState === "mastering" || appState === "done") && analysis && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <AnalysisPanel
                    preAnalysis={analysis}
                    postAnalysis={masterData?.post_analysis ?? null}
                    isProcessing={appState === "mastering"}
                    lang={lang}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mastering progress is shown in a modal overlay — see MasteringProgressModal below */}

            {/* Download Panel — includes A/B player with master */}
            {/* downloadRef marks the scroll target for auto-scroll after mastering */}
            <div ref={downloadRef} />
            <AnimatePresence>
              {appState === "done" && masterData && (
                <motion.div
                  key="download"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <DownloadPanel
                    masterData={masterData}
                    fileId={uploadedFile?.file_id ?? ""}
                    filename={uploadedFile?.filename ?? "track"}
                    platform={platform}
                    preset={preset}
                    intensity={intensity}
                    preAnalysis={analysis!}
                    onReset={handleReset}
                    onRemaster={handleRemaster}
                    onManualAdjust={openManualAdjust}
                    lang={lang}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auto-play master + scroll after mastering completes */}
            <MasterPlayTrigger
              shouldPlay={appState === "done"}
              downloadRef={downloadRef}
            />
          </div>
        </AudioEngineProvider>
        </ErrorBoundary>
      </div>

      {/* ── Sticky bottom "Master NOW" popup ───────────────────────────────────── */}
      <AnimatePresence>
        {appState === "analyzed" && uploadedFile && (
          <motion.div
            key="master-popup"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: "rgba(8,10,18,0.97)",
              backdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(139,92,246,0.2)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(139,92,246,0.08)",
            }}
          >
            <div className="max-w-6xl mx-auto px-4 py-3">
              {/* Download window reminder */}
              <div className="text-center mb-2">
                <span className="text-[10px]" style={{ color: "rgba(196,181,253,0.7)" }}>
                  {T.download_window[lang]()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Format pills */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {FORMAT_OPTIONS.map((fmt) => {
                    const active = selectedFormat === fmt.key;
                    return (
                      <button
                        key={fmt.key}
                        onClick={() => setSelectedFormat(fmt.key)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: active
                            ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(56,189,248,0.15))"
                            : "rgba(255,255,255,0.04)",
                          border: active
                            ? "1px solid rgba(139,92,246,0.5)"
                            : "1px solid rgba(255,255,255,0.08)",
                          color: active ? "var(--accent-purple)" : "var(--text-muted)",
                          boxShadow: active ? "0 0 10px rgba(139,92,246,0.2)" : "none",
                        }}
                      >
                        {fmt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Master NOW button */}
                <MasterButton
                  fileId={uploadedFile.file_id}
                  uploadToken={uploadedFile.upload_token}
                  originalName={uploadedFile.filename}
                  platform={platform}
                  targetLufs={customLufs}
                  preset={preset}
                  intensity={intensity}
                  selectedFormat={selectedFormat}
                  analysis={analysis ?? undefined}
                  referenceAnalysis={referenceAnalysis ?? undefined}
                  isProcessing={false}
                  onStart={handleMasteringStart}
                  onProgress={handleProgressUpdate}
                  onComplete={handleMasteringComplete}
                  onError={handleMasteringError}
                  compact
                  lang={lang}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mastering progress modal ─────────────────────────────────────────── */}
      <MasteringProgressModal
        isOpen={appState === "mastering"}
        step={currentProgress}
        lang={lang}
      />

      {/* ── Manuelle Nachjustierung ──────────────────────────────────────────── */}
      {uploadedFile && (
        <ManualAdjustModal
          open={adjustOpen}
          onClose={closeManualAdjust}
          lang={lang}
          fileId={uploadedFile.file_id}
          uploadToken={uploadedFile.upload_token}
          filename={uploadedFile.filename}
          durationSec={uploadedFile.duration || analysis?.duration_seconds || 0}
          platform={platform}
          preset={preset}
          intensity={intensity}
          analysis={analysis}
          referenceAnalysis={referenceAnalysis}
          serverParams={masterData?.params ?? null}
          onApply={handleApplyAdjustments}
        />
      )}

      {/* Auth modal — opened from the "Sign In / Register" prompt inside UploadZone */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
