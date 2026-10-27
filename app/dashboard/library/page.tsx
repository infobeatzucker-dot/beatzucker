"use client";

import MasteringHistoryTable from "@/components/dashboard/MasteringHistoryTable";
import { useUiLanguage } from "@/lib/useUiLanguage";

export default function LibraryPage() {
  const en = useUiLanguage() === "en";
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{en ? "Library" : "Bibliothek"}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {en ? "Your mastering history — preview, download, notes and multi-select deletion." : "Dein Mastering-Verlauf – Vorschau, Download, Notizen und Löschen per Mehrfachauswahl."}
        </p>
      </div>
      <div
        style={{
          background: "var(--bg-elevated, rgb(var(--bz-paint-1a1a2e)))",
          border: "1px solid rgba(var(--bz-border-ffffff),0.07)",
          borderRadius: "var(--radius-md)",
          padding: "1.5rem",
        }}
      >
        <MasteringHistoryTable />
      </div>
    </div>
  );
}
