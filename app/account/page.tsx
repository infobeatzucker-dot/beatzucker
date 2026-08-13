"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  getOrCreateAudioElement,
  setGlobalAudioAvailable,
  setGlobalAudioPlaying,
  registerGlobalToggle,
  subscribeGlobalAudioState,
  getGlobalAudioState,
} from "@/lib/globalAudio";

interface SavedRef {
  id: string;
  name: string;
  analysisJson: string;
  createdAt: string;
}

interface AccountData {
  user: { id: string; email: string; name: string | null; image: string | null; hasPassword: boolean; createdAt: string };
  twoFactor: boolean;
  dailyUsed: number;
  dailyLimit: number;
  masters: Array<{
    id: string; originalName: string; platform: string; preset: string;
    status: string; lufsIn: number | null; lufsOut: number | null; createdAt: string; notes: string;
  }>;
  savedRefs?: SavedRef[];
  savedRefsLimit?: number;
}

const DOWNLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

function fmt(lufs: number | null) {
  if (lufs == null) return "—";
  return `${lufs.toFixed(1)} LUFS`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData]           = useState<AccountData | null>(null);
  const [loading, setLoading]     = useState(true);

  // Name edit
  const [editName, setEditName]   = useState("");
  const [nameMsg, setNameMsg]     = useState("");

  // Password change
  const [curPw, setCurPw]         = useState("");
  const [newPw, setNewPw]         = useState("");
  const [newPw2, setNewPw2]       = useState("");
  const [pwMsg, setPwMsg]         = useState("");

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Saved references
  const [savedRefs, setSavedRefs] = useState<SavedRef[]>([]);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);

  async function deleteRef(id: string) {
    setDeletingRefId(id);
    await fetch(`/api/references?id=${id}`, { method: "DELETE" });
    setSavedRefs(prev => prev.filter(r => r.id !== id));
    setDeletingRefId(null);
  }

  // 2FA
  const [twoFactorMsg, setTwoFactorMsg] = useState("");
  async function toggleTwoFactor() {
    const current = data?.twoFactor ?? false;
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twoFactor: !current }),
    });
    if (res.ok) {
      setData(d => d ? { ...d, twoFactor: !current } : d);
      setTwoFactorMsg(!current ? "✓ 2FA aktiviert" : "✓ 2FA deaktiviert");
    } else {
      setTwoFactorMsg("Fehler beim Speichern");
    }
    setTimeout(() => setTwoFactorMsg(""), 3000);
  }

  // Notes editing
  const [editingNotes, setEditingNotes] = useState<string | null>(null); // masterId
  const [notesDraft, setNotesDraft]     = useState("");

  // Download helpers
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError]  = useState<string | null>(null);

  async function handleMasterDownload(masterId: string, format: string, originalName: string) {
    setDownloadingId(masterId);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/download?master_id=${masterId}&format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDownloadError(err.error ?? "Download nicht verfügbar");
        setTimeout(() => setDownloadError(null), 5000);
        return;
      }
      const blob = await res.blob();
      const ext  = format.startsWith("wav") ? "wav" : format.startsWith("flac") ? "flac" : format.startsWith("mp3") ? "mp3" : "m4a";
      const safe = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, "_");
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `upmado_${safe}_${format}.${ext}`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Verbindungsfehler");
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleExportDownload() {
    const res = await fetch("/api/account/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `upmado-daten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Preview player
  const [playingMasterId, setPlayingMasterId] = useState<string | null>(null);
  const [previewLoading,  setPreviewLoading]  = useState<string | null>(null);
  const [audioPlaying,    setAudioPlaying]    = useState(() => getGlobalAudioState().playing);
  const previewMasterIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = getOrCreateAudioElement();

    // Sync initial state
    if (audio.src && !audio.paused) {
      setGlobalAudioAvailable(true);
    }

    const onPlay  = () => { setAudioPlaying(true);  setGlobalAudioPlaying(true); };
    const onPause = () => { setAudioPlaying(false); setGlobalAudioPlaying(false); };
    const onEnded = () => {
      setAudioPlaying(false);
      setPlayingMasterId(null);
      previewMasterIdRef.current = null;
      setGlobalAudioPlaying(false);
    };

    audio.addEventListener("play",  onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    registerGlobalToggle(() => {
      if (audio.paused) audio.play().catch(() => {});
      else              audio.pause();
    });

    const unsub = subscribeGlobalAudioState(s => setAudioPlaying(s.playing));
    return () => {
      audio.removeEventListener("play",  onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      unsub();
    };
  }, []);

  function handlePreview(masterId: string, format: string) {
    const audio = getOrCreateAudioElement();

    // Same master → toggle pause/play
    if (previewMasterIdRef.current === masterId) {
      if (audio.paused) audio.play().catch(() => {});
      else              audio.pause();
      return;
    }

    // Different master → load and play
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

  // Master delete
  const [deletingMaster, setDeletingMaster] = useState<string | null>(null);
  async function deleteMaster(masterId: string) {
    if (!confirm("Eintrag aus dem Verlauf löschen?")) return;
    setDeletingMaster(masterId);
    await fetch(`/api/master/${masterId}`, { method: "DELETE" });
    setData(prev => prev ? { ...prev, masters: prev.masters.filter(m => m.id !== masterId) } : prev);
    setDeletingMaster(null);
  }

  async function saveNotes(masterId: string) {
    await fetch(`/api/master/${masterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesDraft }),
    });
    setData(prev => prev ? {
      ...prev,
      masters: prev.masters.map(m => m.id === masterId ? { ...m, notes: notesDraft } : m),
    } : prev);
    setEditingNotes(null);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/account")
      .then(r => r.json())
      .then(d => {
        setData(d);
        setEditName(d.user.name ?? "");
        if (Array.isArray(d.savedRefs)) setSavedRefs(d.savedRefs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setNameMsg(res.ok ? "✓ Name gespeichert" : "Fehler beim Speichern");
    setTimeout(() => setNameMsg(""), 3000);
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (newPw !== newPw2) { setPwMsg("Passwörter stimmen nicht überein."); return; }
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const d = await res.json();
    setPwMsg(res.ok ? "✓ Passwort geändert" : (d.error ?? "Fehler"));
    if (res.ok) { setCurPw(""); setNewPw(""); setNewPw2(""); }
    setTimeout(() => setPwMsg(""), 4000);
  }

  async function deleteAccount() {
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) await signOut({ callbackUrl: "/" });
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ background: "var(--bg-primary)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Lädt…</div>
      </div>
    );
  }

  if (!data) return null;

  const pct = Math.min(100, Math.round(data.dailyUsed / data.dailyLimit * 100));

  const section = (title: string, children: React.ReactNode) => (
    <section style={{
      background: "var(--bg-elevated, #1a1a2e)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "1.5rem",
    }}>
      <h2 style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                   color: "var(--accent-purple)", marginBottom: "1.25rem" }}>{title}</h2>
      {children}
    </section>
  );

  const inputSty: React.CSSProperties = {
    width: "100%", padding: "0.55rem 0.8rem",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "7px", color: "var(--text-primary, #fff)", fontSize: "0.88rem",
    outline: "none", boxSizing: "border-box",
  };

  const msgStyle = (msg: string): React.CSSProperties => ({
    fontSize: "0.8rem", marginTop: "0.4rem",
    color: msg.startsWith("✓") ? "#6ee7b7" : "#fca5a5",
  });

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <Header />

      {/* Download error toast */}
      {downloadError && (
        <div style={{
          position: "fixed", top: "4.5rem", left: "50%", transform: "translateX(-50%)",
          zIndex: 100, background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)", borderRadius: "12px",
          padding: "0.75rem 1.5rem", backdropFilter: "blur(12px)",
          color: "#f87171", fontWeight: 600, fontSize: "0.9rem",
          boxShadow: "0 4px 24px rgba(239,68,68,0.2)",
          whiteSpace: "nowrap",
        }}>
          ✕ {downloadError}
        </div>
      )}

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "6rem 1.5rem 4rem" }}>

        {/* Hero */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{
            display: "inline-block", background: "rgba(124,111,255,0.1)",
            border: "1px solid rgba(124,111,255,0.25)", borderRadius: "6px",
            padding: "0.25rem 0.75rem", fontSize: "0.72rem", color: "var(--accent-purple)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem",
          }}>Konto</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", margin: 0 }}>
            Mein Konto
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
            {data.user.email}
          </p>
        </div>

        {/* ── Nutzung ─────────────────────────────────── */}
        {section("Nutzung", (
          <>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Alle Funktionen sind kostenlos und unbegrenzt nutzbar. Ein faires Tageslimit
              schützt lediglich vor Serverüberlastung.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem",
                          color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              <span>Masters heute</span>
              <span style={{ color: pct >= 90 ? "#f87171" : "var(--text-primary)" }}>
                {data.dailyUsed} / {data.dailyLimit}
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
              <div style={{
                width: `${pct}%`, height: "100%", borderRadius: 3,
                background: pct >= 90
                  ? "linear-gradient(90deg, #f87171, #ef4444)"
                  : "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))",
              }}/>
            </div>
          </>
        ))}

        {/* ── Profil ─────────────────────────────────────── */}
        {section("Profil", (
          <form onSubmit={saveName} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                Anzeigename
              </label>
              <input style={inputSty} value={editName} onChange={e => setEditName(e.target.value)}
                     placeholder="Dein Name" maxLength={80} />
            </div>
            <button type="submit" style={{
              padding: "0.55rem 1.25rem", borderRadius: "7px", border: "none",
              background: "rgba(124,111,255,0.2)", color: "var(--accent-purple)",
              fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", flexShrink: 0,
            }}>Speichern</button>
            {nameMsg && <div style={{ width: "100%", ...msgStyle(nameMsg) }}>{nameMsg}</div>}
          </form>
        ))}

        {/* ── Passwort ────────────────────────────────────── */}
        {data.user.hasPassword && section("Passwort ändern", (
          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <input style={inputSty} type="password" placeholder="Aktuelles Passwort"
                   value={curPw} onChange={e => setCurPw(e.target.value)} required />
            <input style={inputSty} type="password" placeholder="Neues Passwort (min. 8 Zeichen)"
                   value={newPw} onChange={e => setNewPw(e.target.value)} required />
            <input style={inputSty} type="password" placeholder="Neues Passwort wiederholen"
                   value={newPw2} onChange={e => setNewPw2(e.target.value)} required />
            <button type="submit" style={{
              padding: "0.55rem 1.25rem", borderRadius: "7px", border: "none", width: "fit-content",
              background: "rgba(124,111,255,0.2)", color: "var(--accent-purple)",
              fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
            }}>Passwort ändern</button>
            {pwMsg && <div style={msgStyle(pwMsg)}>{pwMsg}</div>}
          </form>
        ))}

        {/* ── Mastering-Verlauf ───────────────────────────── */}
        {section("Mastering-Verlauf", (() => {
          const windowMs = DOWNLOAD_WINDOW_MS;
          const dlFormat = "wav24";
          const dlExt    = "WAV";

          return data.masters.length === 0
            ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Noch keine Masters vorhanden.</p>
            : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["Datum", "Datei", "Genre", "LUFS vorher", "LUFS nachher", "", "Download", ""].map(h => (
                        <th key={h} style={{ padding: "0.4rem 0.6rem", textAlign: "left", color: "var(--text-muted)",
                                             fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.masters.map(m => {
                      const ageMs = Date.now() - new Date(m.createdAt).getTime();
                      const canDownload = m.status === "done" && ageMs < windowMs;
                      return (
                        <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {fmtDate(m.createdAt)}
                          </td>
                          <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-primary)",
                                       maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.originalName}
                          </td>
                          <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {editingNotes === m.id ? (
                              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                                <input
                                  autoFocus
                                  value={notesDraft}
                                  onChange={e => setNotesDraft(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") saveNotes(m.id); if (e.key === "Escape") setEditingNotes(null); }}
                                  maxLength={80}
                                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", borderRadius: "4px",
                                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                                    color: "var(--text-primary)", outline: "none", width: 100 }}
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

                          {/* Play / Pause preview button */}
                          <td style={{ padding: "0.5rem 0.3rem" }}>
                            {canDownload ? (
                              <button
                                onClick={() => handlePreview(m.id, "mp3128")}
                                title={playingMasterId === m.id && audioPlaying ? "Pause" : "Vorschau abspielen"}
                                style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer",
                                  background: playingMasterId === m.id
                                    ? "rgba(0,229,196,0.18)"
                                    : "rgba(255,255,255,0.06)",
                                  color: playingMasterId === m.id ? "var(--accent-cyan)" : "var(--text-muted)",
                                  transition: "all 0.15s",
                                  flexShrink: 0,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,229,196,0.2)")}
                                onMouseLeave={e => (e.currentTarget.style.background = playingMasterId === m.id ? "rgba(0,229,196,0.18)" : "rgba(255,255,255,0.06)")}
                              >
                                {previewLoading === m.id ? (
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                                    style={{ animation: "spin 1s linear infinite" }}>
                                    <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5"
                                      strokeDasharray="18" strokeDashoffset="6"/>
                                  </svg>
                                ) : playingMasterId === m.id && audioPlaying ? (
                                  <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                                    <rect x="0.5" y="0.5" width="2.5" height="8" rx="1"/>
                                    <rect x="6" y="0.5" width="2.5" height="8" rx="1"/>
                                  </svg>
                                ) : (
                                  <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                                    <path d="M1.5 1.2l7 3.3-7 3.3V1.2z"/>
                                  </svg>
                                )}
                              </button>
                            ) : (
                              <span style={{ display: "inline-block", width: 26 }}/>
                            )}
                          </td>

                          <td style={{ padding: "0.5rem 0.6rem" }}>
                            {canDownload ? (
                              <button
                                onClick={() => handleMasterDownload(m.id, dlFormat, m.originalName)}
                                disabled={downloadingId === m.id}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                  padding: "0.22rem 0.55rem", borderRadius: "5px", fontSize: "0.72rem",
                                  fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer",
                                  background: "rgba(0,229,196,0.1)", border: "1px solid rgba(0,229,196,0.3)",
                                  color: downloadingId === m.id ? "var(--text-muted)" : "var(--accent-cyan)",
                                }}
                              >
                                {downloadingId === m.id ? "…" : `↓ ${dlExt}`}
                              </button>
                            ) : (
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {m.status === "done" ? "Abgelaufen" : m.status}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.5rem 0.3rem" }}>
                            <button
                              onClick={() => deleteMaster(m.id)}
                              disabled={deletingMaster === m.id}
                              title="Aus Verlauf löschen"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "rgba(239,68,68,0.4)", fontSize: "0.85rem", padding: "0.1rem 0.3rem",
                                lineHeight: 1,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                              onMouseLeave={e => (e.currentTarget.style.color = "rgba(239,68,68,0.4)")}
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
            );
        })())}

        {/* ── Referenz-Bibliothek ─────────────────────────── */}
        {section("Referenz-Bibliothek", (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                Gespeicherte Referenz-Track-Analysen — kein Audio, nur Analysedaten.
              </p>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                {savedRefs.length} / {data.savedRefsLimit ?? 100} gespeichert
              </span>
            </div>
            {savedRefs.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                Noch keine Referenz-Tracks gespeichert. Analysiere einen Referenz-Track im Mastering-Tool und klicke „Speichern".
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["Gespeichert", "Name", "LUFS", ""].map(h => (
                        <th key={h} style={{ padding: "0.35rem 0.5rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {savedRefs.map(ref => {
                      let lufs: string = "—";
                      try { const a = JSON.parse(ref.analysisJson); lufs = `${a.integrated_lufs?.toFixed(1)} LUFS`; } catch {}
                      return (
                        <tr key={ref.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "0.5rem 0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {fmtDate(ref.createdAt)}
                          </td>
                          <td style={{ padding: "0.5rem 0.5rem", fontSize: "0.82rem", color: "var(--text-primary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ref.name}
                          </td>
                          <td style={{ padding: "0.5rem 0.5rem", fontSize: "0.75rem", color: "var(--accent-purple)", fontVariantNumeric: "tabular-nums" }}>
                            {lufs}
                          </td>
                          <td style={{ padding: "0.5rem 0.3rem" }}>
                            <button
                              onClick={() => deleteRef(ref.id)}
                              disabled={deletingRefId === ref.id}
                              title="Referenz löschen"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "rgba(239,68,68,0.4)", fontSize: "0.85rem", padding: "0.1rem 0.3rem", lineHeight: 1,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                              onMouseLeave={e => (e.currentTarget.style.color = "rgba(239,68,68,0.4)")}
                            >
                              {deletingRefId === ref.id ? "…" : "✕"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {/* ── Sicherheit / 2FA ────────────────────────────── */}
        {data.user.hasPassword && section("Sicherheit", (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", margin: "0 0 0.25rem", fontWeight: 600 }}>
                  2-Faktor-Authentifizierung
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  {data.twoFactor
                    ? "Aktiv — du erhältst bei jedem Login einen Code per E-Mail."
                    : "Deaktiviert — aktiviere es für mehr Sicherheit."}
                </p>
              </div>
              <button
                onClick={toggleTwoFactor}
                style={{
                  padding: "0.45rem 1rem", borderRadius: "7px", border: "none",
                  background: data.twoFactor ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                  color: data.twoFactor ? "#f87171" : "#6ee7b7",
                  fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", flexShrink: 0,
                }}
              >
                {data.twoFactor ? "Deaktivieren" : "Aktivieren"}
              </button>
            </div>
            {twoFactorMsg && (
              <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: twoFactorMsg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>
                {twoFactorMsg}
              </p>
            )}
          </div>
        ))}

        {/* ── Datenschutz & Export ────────────────────────── */}
        {section("Datenschutz", (
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              Gemäß DSGVO Art. 20 kannst du alle gespeicherten Daten herunterladen.
            </p>
            <button
              onClick={handleExportDownload}
              style={{
                display: "inline-block", padding: "0.5rem 1.1rem",
                background: "rgba(124,111,255,0.1)", border: "1px solid rgba(124,111,255,0.25)",
                color: "var(--accent-purple)", borderRadius: "7px",
                fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              Meine Daten exportieren (JSON)
            </button>
          </div>
        ))}

        {/* ── Gefahrenzone ────────────────────────────────── */}
        {section("Gefahrenzone", (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171", borderRadius: "7px", padding: "0.5rem 1rem",
                    fontSize: "0.85rem", cursor: "pointer", fontWeight: 600,
                  }}
                >
                  Konto löschen
                </button>
              ) : (
                <div style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "8px", padding: "1rem",
                }}>
                  <p style={{ fontSize: "0.85rem", color: "#fca5a5", marginBottom: "0.75rem" }}>
                    <strong>Wirklich löschen?</strong> Alle Daten werden unwiderruflich entfernt.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={deleteAccount} style={{
                      background: "#ef4444", border: "none", color: "#fff",
                      borderRadius: "6px", padding: "0.45rem 0.9rem",
                      fontSize: "0.82rem", cursor: "pointer", fontWeight: 700,
                    }}>
                      Ja, Konto löschen
                    </button>
                    <button onClick={() => setDeleteConfirm(false)} style={{
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--text-secondary)", borderRadius: "6px", padding: "0.45rem 0.9rem",
                      fontSize: "0.82rem", cursor: "pointer",
                    }}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

      </main>
      <Footer />
    </div>
  );
}
