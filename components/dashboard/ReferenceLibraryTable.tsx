"use client";

import { useEffect, useState } from "react";

interface SavedRef {
  id: string;
  name: string;
  analysisJson: string;
  createdAt: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ReferenceLibraryTable() {
  const [savedRefs, setSavedRefs] = useState<SavedRef[] | null>(null);
  const [limit, setLimit] = useState(100);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.savedRefs)) setSavedRefs(d.savedRefs);
        if (typeof d.savedRefsLimit === "number") setLimit(d.savedRefsLimit);
      })
      .catch(() => setSavedRefs([]));
  }, []);

  async function deleteRef(id: string) {
    setDeletingRefId(id);
    await fetch(`/api/references?id=${id}`, { method: "DELETE" });
    setSavedRefs((prev) => prev ? prev.filter((r) => r.id !== id) : prev);
    setDeletingRefId(null);
  }

  if (savedRefs === null) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Lädt…</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
          Gespeicherte Referenztrack-Analysen — kein Audio, nur Analysedaten.
        </p>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
          {savedRefs.length} / {limit} gespeichert
        </span>
      </div>
      {savedRefs.length === 0 ? (
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          Noch keine Referenztracks gespeichert. Analysiere einen Referenztrack im Mastering-Studio und klicke „Speichern“.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Gespeichert", "Name", "LUFS", ""].map((h) => (
                  <th key={h} style={{ padding: "0.35rem 0.5rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {savedRefs.map((ref) => {
                let lufs = "—";
                try { const a = JSON.parse(ref.analysisJson); lufs = `${a.integrated_lufs?.toFixed(1)} LUFS`; } catch {}
                return (
                  <tr key={ref.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.5rem 0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDate(ref.createdAt)}</td>
                    <td style={{ padding: "0.5rem 0.5rem", fontSize: "0.82rem", color: "var(--text-primary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ref.name}</td>
                    <td style={{ padding: "0.5rem 0.5rem", fontSize: "0.75rem", color: "var(--accent-purple)", fontVariantNumeric: "tabular-nums" }}>{lufs}</td>
                    <td style={{ padding: "0.5rem 0.3rem" }}>
                      <button
                        onClick={() => deleteRef(ref.id)}
                        disabled={deletingRefId === ref.id}
                        title="Referenz löschen"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(239,68,68,0.4)", fontSize: "0.85rem", padding: "0.1rem 0.3rem", lineHeight: 1 }}
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
  );
}
