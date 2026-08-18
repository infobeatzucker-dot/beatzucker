"use client";

import MasteringHistoryTable from "@/components/dashboard/MasteringHistoryTable";

export default function LibraryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Bibliothek</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Dein Mastering-Verlauf — Vorschau, Download und Notizen.
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
        <MasteringHistoryTable />
      </div>
    </div>
  );
}
