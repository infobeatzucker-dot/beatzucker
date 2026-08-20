"use client";

import { useEffect, useState, useRef } from "react";
import {
  getOrCreateAudioElement,
  setGlobalAudioAvailable,
  setGlobalAudioPlaying,
  registerGlobalToggle,
  subscribeGlobalAudioState,
  getGlobalAudioState,
} from "@/lib/globalAudio";

interface Master {
  id: string; originalName: string; platform: string; preset: string;
  status: string; lufsIn: number | null; lufsOut: number | null; createdAt: string;
  completedAt: string | null; expiresAt: string | null; downloadAvailable: boolean; notes: string;
  formats: string[]; selectedFormat: string | null;
}

const FORMAT_LABEL: Record<string, string> = {
  wav32: "WAV 32", wav24: "WAV 24", wav16: "WAV 16", flac: "FLAC",
  mp3320: "MP3 320", mp3128: "MP3 128", aac256: "AAC 256",
};

function fmt(lufs: number | null) {
  if (lufs == null) return "—";
  return `${lufs.toFixed(1)} LUFS`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function MasteringHistoryTable() {
  const [masters, setMasters] = useState<Master[] | null>(null);

  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [playingMasterId, setPlayingMasterId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(() => getGlobalAudioState().playing);
  const previewMasterIdRef = useRef<string | null>(null);

  const [deletingMaster, setDeletingMaster] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.masters)) setMasters(d.masters); })
      .catch(() => setMasters([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = getOrCreateAudioElement();

    if (audio.src && !audio.paused) setGlobalAudioAvailable(true);

    const onPlay  = () => { setAudioPlaying(true);  setGlobalAudioPlaying(true); };
    const onPause = () => { setAudioPlaying(false); setGlobalAudioPlaying(false); };
    const onEnded = () => {
      setAudioPlaying(false);
      setPlayingMasterId(null);
      previewMasterIdRef.current = null;
      setGlobalAudioPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    registerGlobalToggle(() => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });

    const unsub = subscribeGlobalAudioState((s) => setAudioPlaying(s.playing));
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      unsub();
    };
  }, []);

  function handlePreview(masterId: string, format: string) {
    const audio = getOrCreateAudioElement();

    if (previewMasterIdRef.current === masterId) {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      return;
    }

    audio.pause();
    setPreviewLoading(masterId);
    setPlayingMasterId(null);
    previewMasterIdRef.current = masterId;

    audio.src = `/api/download?master_id=${masterId}&format=${format}`;
    audio.load();

    audio.addEventListener("canplay", () => {
      if (previewMasterIdRef.current !== masterId) return;
      setPreviewLoading(null);
      setPlayingMasterId(masterId);
      setGlobalAudioAvailable(true);
      audio.play().catch(() => { setPreviewLoading(null); });
    }, { once: true });

    audio.addEventListener("error", () => {
      if (previewMasterIdRef.current !== masterId) return;
      setPreviewLoading(null);
      setPlayingMasterId(null);
      previewMasterIdRef.current = null;
    }, { once: true });
  }

  async function handleMasterDownload(masterId: string, format: string) {
    setDownloadingId(masterId);
    setDownloadError(null);
    try {
      const href = `/api/download?master_id=${encodeURIComponent(masterId)}&format=${encodeURIComponent(format)}`;
      // A one-byte range request validates auth, expiry and file existence
      // without buffering the complete (potentially 200 MB) master in JS RAM.
      const res = await fetch(href, { headers: { Range: "bytes=0-0" } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDownloadError(err.error ?? "Download nicht verfügbar");
        setTimeout(() => setDownloadError(null), 5000);
        return;
      }
      await res.body?.cancel();
      const a = document.createElement("a");
      a.href = href;
      a.click();
    } catch {
      setDownloadError("Verbindungsfehler");
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloadingId(null);
    }
  }

  async function deleteMaster(masterId: string) {
    if (!confirm("Eintrag aus dem Verlauf löschen?")) return;
    setDeletingMaster(masterId);
    await fetch(`/api/master/${masterId}`, { method: "DELETE" });
    setMasters((prev) => prev ? prev.filter((m) => m.id !== masterId) : prev);
    setDeletingMaster(null);
  }

  async function saveNotes(masterId: string) {
    await fetch(`/api/master/${masterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesDraft }),
    });
    setMasters((prev) => prev ? prev.map((m) => m.id === masterId ? { ...m, notes: notesDraft } : m) : prev);
    setEditingNotes(null);
  }

  if (masters === null) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Lädt…</p>;
  }

  return (
    <div>
      {downloadError && (
        <div style={{
          marginBottom: "1rem", background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px",
          padding: "0.6rem 1rem", color: "#f87171", fontSize: "0.82rem", fontWeight: 600,
        }}>
          {downloadError}
        </div>
      )}

      {masters.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Noch keine Masters vorhanden.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Datum", "Datei", "Genre", "LUFS vorher", "LUFS nachher", "", "Download", ""].map((h) => (
                  <th key={h} style={{ padding: "0.4rem 0.6rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {masters.map((m) => {
                const formats = Array.isArray(m.formats) ? m.formats : [];
                const previewFormat = formats.includes("mp3320")
                  ? "mp3320"
                  : formats.includes("mp3128") ? "mp3128" : null;
                const selectedFormat = m.selectedFormat && formats.includes(m.selectedFormat)
                  ? m.selectedFormat
                  : formats.find((format) => format !== previewFormat) ?? previewFormat;
                const expired = Boolean(m.expiresAt && new Date(m.expiresAt).getTime() <= Date.now());
                const canDownload = m.downloadAvailable && !expired && Boolean(selectedFormat);
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDate(m.completedAt ?? m.createdAt)}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-primary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.originalName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {editingNotes === m.id ? (
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <input
                            autoFocus
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveNotes(m.id); if (e.key === "Escape") setEditingNotes(null); }}
                            maxLength={80}
                            style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-primary)", outline: "none", width: 100 }}
                          />
                          <button onClick={() => saveNotes(m.id)} style={{ fontSize: "0.72rem", color: "#6ee7b7", background: "none", border: "none", cursor: "pointer" }}>✓</button>
                          <button onClick={() => setEditingNotes(null)} style={{ fontSize: "0.72rem", color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                        </div>
                      ) : (
                        <span
                          onClick={() => { setEditingNotes(m.id); setNotesDraft(m.notes); }}
                          style={{ cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.1)" }}
                          title="Klicken zum Bearbeiten"
                        >
                          {m.notes || "—"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-secondary)" }}>{fmt(m.lufsIn)}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "#6ee7b7" }}>{fmt(m.lufsOut)}</td>

                    <td style={{ padding: "0.5rem 0.3rem" }}>
                      {canDownload && previewFormat ? (
                        <button
                          onClick={() => handlePreview(m.id, previewFormat)}
                          title={playingMasterId === m.id && audioPlaying ? "Pause" : "Vorschau abspielen"}
                          style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer",
                            background: playingMasterId === m.id ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.06)",
                            color: playingMasterId === m.id ? "var(--accent-cyan)" : "var(--text-muted)",
                            transition: "all 0.15s", flexShrink: 0,
                          }}
                        >
                          {previewLoading === m.id ? (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="18" strokeDashoffset="6" />
                            </svg>
                          ) : playingMasterId === m.id && audioPlaying ? (
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                              <rect x="0.5" y="0.5" width="2.5" height="8" rx="1" />
                              <rect x="6" y="0.5" width="2.5" height="8" rx="1" />
                            </svg>
                          ) : (
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                              <path d="M1.5 1.2l7 3.3-7 3.3V1.2z" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <span style={{ display: "inline-block", width: 26 }} />
                      )}
                    </td>

                    <td style={{ padding: "0.5rem 0.6rem" }}>
                      {canDownload ? (
                        <button
                          onClick={() => handleMasterDownload(m.id, selectedFormat!)}
                          disabled={downloadingId === m.id}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.22rem 0.55rem", borderRadius: "5px", fontSize: "0.72rem",
                            fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer",
                            background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)",
                            color: downloadingId === m.id ? "var(--text-muted)" : "var(--accent-cyan)",
                          }}
                        >
                          {downloadingId === m.id ? "…" : `↓ ${FORMAT_LABEL[selectedFormat!] ?? selectedFormat!.toUpperCase()}`}
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {m.status === "done" ? (expired ? "Abgelaufen" : "Nicht verfügbar") : m.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 0.3rem" }}>
                      <button
                        onClick={() => deleteMaster(m.id)}
                        disabled={deletingMaster === m.id}
                        title="Aus Verlauf löschen"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(239,68,68,0.4)", fontSize: "0.85rem", padding: "0.1rem 0.3rem", lineHeight: 1 }}
                      >
                        {deletingMaster === m.id ? "…" : "✕"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
            Downloads sind 24h nach Fertigstellung verfügbar.
          </p>
        </div>
      )}
    </div>
  );
}
