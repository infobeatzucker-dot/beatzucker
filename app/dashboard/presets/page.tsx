"use client";

import ReferenceLibraryTable from "@/components/dashboard/ReferenceLibraryTable";
import AccountLabPresets from "@/components/AccountLabPresets";
import { useUiLanguage } from "@/lib/useUiLanguage";

export default function PresetsPage() {
  const lang=useUiLanguage();
  return (
    <div>
      <AccountLabPresets lang={lang}/>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{lang==="en"?"Reference library":"Referenz-Bibliothek"}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {lang==="en"?"Saved reference analyses you can reuse in the mastering studio.":"Gespeicherte Referenztrack-Analysen, die du im Mastering-Studio wiederverwenden kannst."}
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
        <ReferenceLibraryTable />
      </div>
    </div>
  );
}
