"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import AnalysisPanel from "@/components/AnalysisPanel";
import MasterButton from "@/components/MasterButton";
import DownloadPanel from "@/components/DownloadPanel";
import ABPlayer from "@/components/ABPlayer";
import PlatformTargets from "@/components/PlatformTargets";
import PresetSelector from "@/components/PresetSelector";
import MasteringIntensity from "@/components/MasteringIntensity";
import ReferenceTrack, { type SavedRef, type ReferenceAnalysis as RefAnalysis } from "@/components/ReferenceTrack";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import ScrollToTop from "@/components/ScrollToTop";
import MasteringProgressModal from "@/components/MasteringProgressModal";
import PromoPopup from "@/components/PromoPopup";
import { AudioEngineProvider, useAudioEngine } from "@/contexts/AudioEngineContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DAILY_MASTER_LIMIT } from "@/lib/constants";

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

export type AppState = "idle" | "uploaded" | "analyzing" | "analyzed" | "mastering" | "done";
export type Platform  = "spotify" | "apple" | "youtube" | "club" | "tidal" | "amazon" | "deezer" | "tiktok" | "soundcloud" | "broadcast" | "custom";
export type Preset    = "auto" | "electronic" | "hiphop" | "rock" | "pop" | "jazz" | "classical" | "podcast" | "metal" | "rnb" | "ambient" | "lofi" | "country" | "trap" | "latin" | "dance" | "techno" | "edm";

export interface AnalysisData {
  integrated_lufs:    number;
  true_peak:          number;
  dr_value:           number;
  crest_factor:       number;
  lra:                number;
  rms_sub:            number;
  rms_low:            number;
  rms_mid:            number;
  rms_high:           number;
  rms_air:            number;
  spectral_centroid:  number;
  spectral_rolloff:   number;
  spectral_flatness:  number;
  stereo_width:       number;
  mono_compatibility: number;
  bpm:                number;
  key:                string;
  transient_density:  number;
  clipping_detected:  boolean;
  dc_offset:          number;
  duration_seconds:   number;
  sample_rate:        number;
  bit_depth:          number;
  channels:           number;
}

export interface MasterData {
  master_id: string;
  formats: {
    wav32:  string;
    wav24:  string;
    wav16:  string;
    flac:   string;
    mp3320: string;
    mp3128: string;
    aac256: string;
  };
  post_analysis: AnalysisData;
  notes: string;
}

export interface UploadedFile {
  file_id:  string;
  filename: string;
  duration: number;
  format:   string;
  size:     number;
}

export interface ProgressStep {
  step:     string;
  label:    string;
  progress: number;
}

type Lang = "de" | "en";

const T = {
  hero_free_badge: {
    de: "100% kostenlos · Kein Abo · Keine Kreditkarte",
    en: "100% free · No subscription · No credit card",
  },
  hero_badge:  { de: "KI-gestütztes Professionelles Mastering", en: "AI-Powered Professional Mastering" },
  hero_tagline: {
    de: [
      { text: "Upload",   color: "var(--accent-purple)" },
      { text: "Mastern",  color: "var(--accent-cyan)" },
      { text: "Download", color: "#f59e0b" },
    ],
    en: [
      { text: "Upload",   color: "var(--accent-purple)" },
      { text: "Master",   color: "var(--accent-cyan)" },
      { text: "Download", color: "#f59e0b" },
    ],
  },
  hero_desc: {
    de: "Professionelle Mastering-Pipeline powered by KI. Spotify-konformer Lautstärkepegel, Multiband-Kompression, M/S-Processing — in Sekunden. Und zwar komplett kostenlos.",
    en: "Professional-grade mastering chain powered by AI. Spotify-compliant loudness, multiband compression, M/S processing — in seconds. Completely free.",
  },
  free_limit: {
    de: (used: number, limit: number) => used >= limit
      ? `Tageslimit erreicht (${used}/${limit} Masters heute).`
      : `${used} von ${limit} Masters heute genutzt`,
    en: (used: number, limit: number) => used >= limit
      ? `Daily limit reached (${used}/${limit} masters today).`
      : `${used} of ${limit} masters used today`,
  },
  neue_datei: { de: "Neue Datei", en: "New File" },
  download_window: {
    de: () => `⏱ Nach Fertigstellung 24 Stunden zum Download verfügbar — danach automatische Löschung`,
    en: () => `⏱ Download available for 24 hours after completion — then automatically deleted`,
  },
  lang_toggle: { de: "DE", en: "EN" },
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

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const [lang, setLang] = useState<Lang>("de");
  const [dailyUsed, setDailyUsed] = useState<number | null>(null);
  const [appState,         setAppState]         = useState<AppState>("idle");
  const [uploadedFile,     setUploadedFile]     = useState<UploadedFile | null>(null);
  const [analysis,         setAnalysis]         = useState<AnalysisData | null>(null);
  const [masterData,       setMasterData]       = useState<MasterData | null>(null);
  const [platform,         setPlatform]         = useState<Platform>("spotify");
  const [preset,           setPreset]           = useState<Preset>("auto");
  const [intensity,        setIntensity]        = useState<number>(65);
  const [currentProgress,  setCurrentProgress]  = useState<ProgressStep | null>(null);
  const [selectedFormat,   setSelectedFormat]   = useState<string>("mp3128");
  const [referenceAnalysis, setReferenceAnalysis] = useState<AnalysisData | null>(null);
  const [savedRefs, setSavedRefs] = useState<SavedRef[]>([]);

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

  const handleUploadComplete   = useCallback((file: UploadedFile) => { setUploadedFile(file); setAppState("uploaded"); }, []);
  const handleAnalysisComplete = useCallback((data: AnalysisData) => { setAnalysis(data); setAppState("analyzed"); }, []);

  const handleMasteringStart = useCallback(() => {
    isMasteringRef.current = true;
    setAppState("mastering");
    setCurrentProgress({ step: "analyzing", label: "Analyzing track…", progress: 5 });
    // No scroll needed — progress is shown in a modal overlay
  }, []);

  const handleProgressUpdate = useCallback((step: ProgressStep) => setCurrentProgress(step), []);

  const handleMasteringComplete = useCallback((data: MasterData) => {
    if (!isMasteringRef.current) return; // stale callback after reset/remaster — ignore
    isMasteringRef.current = false;
    setMasterData(data);
    setAppState("done");
    setCurrentProgress(null);
  }, []);

  const handleMasteringError = useCallback(() => {
    if (!isMasteringRef.current) return; // stale callback — ignore
    isMasteringRef.current = false;
    setAppState("analyzed");
    setCurrentProgress(null);
  }, []);

  const handleReset = useCallback(() => {
    isMasteringRef.current = false; // cancel any in-flight mastering callbacks
    setAppState("idle");
    setUploadedFile(null);
    setAnalysis(null);
    setMasterData(null);
    setCurrentProgress(null);
    scrollToPanel();
  }, [scrollToPanel]);

  // Remaster: keep file + analysis, just clear the master result
  const handleRemaster = useCallback(() => {
    isMasteringRef.current = false; // cancel any in-flight mastering callbacks
    setMasterData(null);
    setCurrentProgress(null);
    setAppState("analyzed");
    scrollToPanel();
  }, [scrollToPanel]);

  // Audio engine URLs
  const originalUrl = uploadedFile ? `/api/preview?file_id=${uploadedFile.file_id}` : "";
  const masteredUrl = masterData?.formats.mp3128 || masterData?.formats.mp3320 || masterData?.formats.wav16 || "";

  return (
    <div className="min-h-screen grid-bg">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 pb-8 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {/* Video background — objectPosition: top to avoid top-clipping */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.28, filter: "blur(1px) saturate(1.4)", objectPosition: "top center" }}
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(8,10,18,0.3) 0%, rgba(8,10,18,0.05) 50%, rgba(8,10,18,0.7) 100%)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(ellipse at center, rgba(124,111,255,0.08) 0%, transparent 70%)" }}
          />
        </div>
        <motion.div
          className="relative z-10 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Free badge — first thing visitors see */}
          <motion.div
            className="flex justify-center mb-5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(0,229,196,0.15), rgba(124,111,255,0.1))",
                border: "1px solid rgba(0,229,196,0.45)",
                boxShadow: "0 0 24px rgba(0,229,196,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 18, height: 18, background: "rgba(0,229,196,0.25)" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span
                className="text-xs sm:text-sm font-bold"
                style={{ color: "var(--accent-cyan)", letterSpacing: "0.01em" }}
              >
                {T.hero_free_badge[lang]}
              </span>
            </div>
          </motion.div>

          {/* Language Toggle */}
          <div className="flex justify-center mb-4 gap-1">
            {(["de", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: "0.25rem 0.7rem",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.15s",
                  background: lang === l ? "rgba(124,111,255,0.2)" : "rgba(255,255,255,0.05)",
                  borderColor: lang === l ? "rgba(124,111,255,0.5)" : "rgba(255,255,255,0.1)",
                  color: lang === l ? "var(--accent-purple)" : "var(--text-muted)",
                  letterSpacing: "0.08em",
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <motion.div
            className="label mb-4"
            style={{ color: "var(--accent-cyan)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {T.hero_badge[lang]}
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-2">
            <span style={{ color: "var(--accent-purple)" }}>Up</span>
            <span style={{ color: "var(--accent-cyan)" }}>Ma</span>
            <span style={{ color: "#f59e0b" }}>Do</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4" style={{ color: "var(--text-muted)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
            {T.hero_tagline[lang].map((item, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                <span style={{ color: item.color }}>{item.text}</span>
                {i < arr.length - 1 && <span style={{ opacity: 0.35 }}>·</span>}
              </span>
            ))}
          </div>
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            {T.hero_desc[lang]}
          </p>
        </motion.div>
      </section>

      {/* Main Mastering Interface */}
      <main className="max-w-6xl mx-auto px-4 pb-32" ref={mainPanelRef}>
        <ErrorBoundary>
        <AudioEngineProvider originalUrl={originalUrl} masteredUrl={masteredUrl}>
          <div
            className="glass-panel-elevated p-6 md:p-8 relative"
            style={{
              boxShadow: appState === "mastering"
                ? "0 0 40px rgba(124,111,255,0.2), 0 0 80px rgba(0,229,196,0.05)"
                : "0 4px 40px rgba(0,0,0,0.4)",
            }}
          >
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
                  : "rgba(124,111,255,0.07)",
                border: `1px solid ${dailyUsed >= DAILY_MASTER_LIMIT ? "rgba(239,68,68,0.25)" : dailyUsed >= DAILY_MASTER_LIMIT - 1 ? "rgba(245,158,11,0.25)" : "rgba(124,111,255,0.2)"}`,
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

            {/* Panel header row — Platform + Preset + optional "Neue Datei" link */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <PlatformTargets value={platform} onChange={setPlatform} />
              <div className="flex flex-col gap-1">
                <PresetSelector value={preset} onChange={setPreset} />
                {/* "Neue Datei" appears under preset when a file is loaded */}
                <AnimatePresence>
                  {appState !== "idle" && (
                    <motion.button
                      key="neue-datei-top"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={handleReset}
                      className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity self-end pt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                      </svg>
                      {T.neue_datei[lang]}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Intensity + Reference Track row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <MasteringIntensity value={intensity} onChange={setIntensity} />
              <ReferenceTrack
                onReference={(a) => setReferenceAnalysis(a as AnalysisData | null)}
                savedRefs={savedRefs}
                onSaveRef={handleSaveRef}
                onDeleteRef={handleDeleteRef}
              />
            </div>

            {/* Upload Zone */}
            <AnimatePresence mode="wait">
              {(appState === "idle" || appState === "uploaded" || appState === "analyzing") && (
                <motion.div
                  key="upload"
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
                  />
                </motion.div>
              )}
            </AnimatePresence>

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
                  <ABPlayer filename={uploadedFile.filename} />
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
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
      </main>

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
              borderTop: "1px solid rgba(124,111,255,0.2)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(124,111,255,0.08)",
            }}
          >
            <div className="max-w-6xl mx-auto px-4 py-3">
              {/* Download window reminder */}
              <div className="text-center mb-2">
                <span className="text-[10px]" style={{ color: "rgba(245,200,66,0.7)" }}>
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
                            ? "linear-gradient(135deg, rgba(124,111,255,0.25), rgba(0,229,196,0.15))"
                            : "rgba(255,255,255,0.04)",
                          border: active
                            ? "1px solid rgba(124,111,255,0.5)"
                            : "1px solid rgba(255,255,255,0.08)",
                          color: active ? "var(--accent-purple)" : "var(--text-muted)",
                          boxShadow: active ? "0 0 10px rgba(124,111,255,0.2)" : "none",
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
                  originalName={uploadedFile.filename}
                  platform={platform}
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
      />

      <FeaturesSection lang={lang} />
      <TestimonialsSection lang={lang} />
      <Footer />
      <ScrollToTop />
      <PromoPopup />
    </div>
  );
}
