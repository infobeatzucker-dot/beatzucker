import type { Lang } from "@/lib/types/mastering";
/** Pure visual selection: no playback, seek, decode or delayed callback. */
export default function ABModeSwitch({ mode, onChange, available, lang }: { mode: "A" | "B"; onChange: (mode: "A" | "B") => void; available: boolean; lang: Lang }) {
  return <div className="studio-ab-switch" data-mode={mode} role="group" aria-label={lang === "de" ? "Original und Master vergleichen" : "Compare original and master"}
    style={{ display: "flex", gap: 12, width: "100%", minHeight: 50, position: "relative", isolation: "isolate" }}>
    <span className="studio-ab-marker" aria-hidden="true" />
    {(["A", "B"] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} disabled={value === "B" && !available}
      style={{ display: "flex", position: "relative", zIndex: 1, flex: "1 1 0", minWidth: 0, minHeight: 50, alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 10px", borderRadius: 12,
        border: `1px solid ${mode === value ? (value === "A" ? "#b19aff" : "#83dff1") : "#46516a"}`,
        background: mode === value ? (value === "A" ? "#29213f" : "#17323e") : "#151c2b",
        color: mode === value ? (value === "A" ? "#d6c9ff" : "#b6f1ff") : "#b7c3d9", fontSize: 14, fontWeight: 650,
        cursor: value === "B" && !available ? "not-allowed" : "pointer" }}
      title={value === "B" && !available ? (lang === "de" ? "Master noch nicht verfügbar" : "Master not available yet") : undefined}
      onClick={() => onChange(value)}>
      <span className="studio-ab-letter" aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 23, height: 23, borderRadius: 6, border: "1px solid currentColor", fontSize: 11 }}>{value}</span>
      <span>{value === "A" ? "Original" : lang === "de" ? "Master" : "Mastered"}</span>
      <span className="studio-ab-dot" aria-hidden="true" />
    </button>)}
  </div>;
}
