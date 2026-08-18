"use client";

import { useEffect, useState } from "react";

interface Master {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
  formats: string[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  done: "Fertig",
  processing: "In Bearbeitung",
  error: "Fehler",
};

export default function UploadsPage() {
  const [masters, setMasters] = useState<Master[] | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.masters)) setMasters(d.masters); })
      .catch(() => setMasters([]));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Uploads</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Deine zuletzt hochgeladenen Tracks im Überblick.
        </p>
      </div>
      <div
        style={{
          background: "var(--bg-elevated, #1a1a2e)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "var(--radius-md)",
          padding: "1.5rem",
        }}
      >
        {masters === null ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Lädt…</p>
        ) : masters.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Noch keine Uploads vorhanden.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Datei", "Datum", "Formate", "Status"].map((h) => (
                    <th key={h} style={{ padding: "0.4rem 0.6rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {masters.slice(0, 10).map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-primary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.originalName}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDate(m.createdAt)}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                      {m.formats.length > 0 ? m.formats.join(", ") : "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "5px",
                        color: m.status === "done" ? "#6ee7b7" : m.status === "error" ? "#f87171" : "var(--accent-cyan)",
                        background: m.status === "done" ? "rgba(16,185,129,0.1)" : m.status === "error" ? "rgba(239,68,68,0.1)" : "rgba(56,189,248,0.1)",
                      }}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
