"use client";

import { motion } from "framer-motion";
import { MasterData } from "@/app/page";
import ABPlayer from "./ABPlayer";
import DonateButton from "./DonateButton";

interface Props {
  masterData:  MasterData;
  fileId:      string;
  filename:    string;
  platform:    string;
  preset:      string;
  intensity:   number;
  preAnalysis: import("@/app/page").AnalysisData;
  onReset:     () => void;
  onRemaster?: () => void;  // Keep file + analysis, go back to preset selection
}

const FORMAT_CONFIG = [
  { key: "wav32",  label: "WAV 32-bit Float", desc: "Highest quality", ext: "wav" },
  { key: "wav24",  label: "WAV 24-bit",        desc: "Studio quality", ext: "wav" },
  { key: "wav16",  label: "WAV 16-bit",        desc: "CD quality",     ext: "wav" },
  { key: "flac",   label: "FLAC",              desc: "Lossless",       ext: "flac" },
  { key: "mp3320", label: "MP3 320kbps",       desc: "High quality",   ext: "mp3" },
  { key: "mp3128", label: "MP3 128kbps",       desc: "Standard",       ext: "mp3" },
  { key: "aac256", label: "AAC 256kbps",       desc: "Streaming",      ext: "m4a" },
] as const;

type FormatKey = keyof MasterData["formats"];

export default function DownloadPanel({ masterData, fileId, filename, platform, preset, intensity, preAnalysis, onReset, onRemaster }: Props) {
  const displayNotes = masterData.notes;

  // Build clean base name: strip extension + sanitize for filename
  const cleanName = filename
    .replace(/\.[^/.]+$/, "")               // remove extension
    .replace(/[^a-zA-Z0-9_\-]/g, "_")      // replace special chars
    .toLowerCase();

  const openReport = () => {
    const payload = {
      filename,
      platform,
      preset,
      intensity,
      pre:   preAnalysis,
      post:  masterData.post_analysis,
      notes: masterData.notes,
      date:  new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }),
    };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    window.open(`/api/report?data=${b64}`, "_blank");
  };

  // fmtKey = "mp3128", ext = "mp3"  →  upmado_trackname_mp3128.mp3
  const handleDownload = (fmtKey: string, ext: string, url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `upmado_${cleanName}_${fmtKey}.${ext}`;
    a.click();
  };

  return (
    <div className="mt-6">
      {/* A/B Comparison Player — URLs are provided via AudioEngineContext */}
      <ABPlayer filename={filename} />

      {/* Success Banner */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(135deg, rgba(0,229,196,0.08), rgba(124,111,255,0.08))",
          border: "1px solid rgba(0,229,196,0.25)",
        }}
      >
        <div className="flex items-start gap-3">
          {/* Checkmark */}
          <div
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: "rgba(0,229,196,0.15)", border: "1px solid rgba(0,229,196,0.35)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5c4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm mb-0.5" style={{ color: "var(--accent-cyan)" }}>
              Mastering complete
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {displayNotes}
            </div>
          </div>
        </div>
      </div>

      {/* Report button row */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{
            background: "rgba(124,111,255,0.08)",
            border: "1px solid rgba(124,111,255,0.25)",
            color: "var(--accent-purple)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Mastering Report (PDF)
        </button>
      </div>

      {/* Download Options */}
      <div className="label mb-3">Download Formats</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {FORMAT_CONFIG.map((fmt) => {
          const url = masterData.formats[fmt.key as FormatKey];
          const isLocked = !url;

          return (
            <button
              key={fmt.key}
              onClick={() => !isLocked && url && handleDownload(fmt.key, fmt.ext, url)}
              disabled={isLocked}
              className="flex items-center justify-between p-3 rounded-xl transition-all text-left"
              style={{
                background: isLocked
                  ? "rgba(14,17,23,0.4)"
                  : "rgba(124,111,255,0.08)",
                border: isLocked
                  ? "1px solid var(--border-subtle)"
                  : "1px solid rgba(124,111,255,0.2)",
                opacity: isLocked ? 0.5 : 1,
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: isLocked ? "var(--text-muted)" : "var(--text-primary)" }}>
                  {fmt.label}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {fmt.desc}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(0,229,196,0.1)",
                    color: "var(--accent-cyan)",
                    border: "1px solid rgba(0,229,196,0.2)",
                  }}
                >
                  FREE
                </span>
                {!isLocked && <span style={{ color: "var(--accent-purple)", fontSize: 14 }}>↓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Remaster-Hinweis: anderes Format wählen und erneut mastern */}
      <div
        className="mt-4 p-3 rounded-xl flex items-center gap-3"
        style={{
          background: "rgba(124,111,255,0.06)",
          border: "1px solid rgba(124,111,255,0.18)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Möchtest du ein anderes Format? Wähle es oben aus und{" "}
          {onRemaster ? (
            <button onClick={onRemaster} className="font-semibold hover:opacity-80" style={{ color: "var(--accent-purple)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              mastere erneut
            </button>
          ) : "mastere erneut"}.
          {" "}Alle Funktionen sind kostenlos und unbegrenzt oft nutzbar.
        </p>
      </div>

      <DonateButton variant="panel" />

      {/* Action buttons row */}
      <div className={`mt-6 flex gap-3 ${onRemaster ? "flex-col sm:flex-row" : ""}`}>
        {/* Remaster – keep file, change params */}
        {onRemaster && (
          <motion.button
            onClick={onRemaster}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: "rgba(0,229,196,0.07)",
              border: "1px solid rgba(0,229,196,0.25)",
              color: "var(--accent-cyan)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" stroke="var(--accent-cyan)">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Remaster (neue Parameter)
          </motion.button>
        )}

        {/* New Master – full reset */}
        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`${onRemaster ? "flex-1" : "w-full"} flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold`}
          style={{
            background: "rgba(124,111,255,0.08)",
            border: "1px solid rgba(124,111,255,0.25)",
            color: "var(--accent-purple)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" stroke="var(--accent-purple)">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Neuen Master erstellen
        </motion.button>
      </div>
    </div>
  );
}
