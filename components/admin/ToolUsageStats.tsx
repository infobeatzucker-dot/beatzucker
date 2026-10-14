"use client";
import { useEffect, useState } from "react";
import { TOOL_GUIDES } from "@/lib/toolGuidance";
import { useUiLanguage } from "@/lib/useUiLanguage";

type Row = { day: string; tool: string; outcome: string; count: number };
export default function ToolUsageStats() {
  const lang = useUiLanguage(), en = lang === "en";
  const [days, setDays] = useState(30), [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<Row[]>([]), [today, setToday] = useState("");
  const [busy, setBusy] = useState(true), [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController(); setBusy(true); setError("");
    fetch(`/api/admin/tool-usage?days=${days}`, { signal: abort.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(data => { setRows(data.rows); setToday(data.today); })
      .catch(() => { if (!abort.signal.aborted) setError(en ? "Statistics unavailable. Please retry." : "Statistik nicht verfügbar. Bitte erneut versuchen."); })
      .finally(() => { if (!abort.signal.aborted) setBusy(false); });
    return () => abort.abort();
  }, [days, refresh, en]);
  const counts = (tool?: string) => {
    const selected = tool ? rows.filter(row => row.tool === tool) : rows;
    const count = (outcome?: string) => selected.filter(row => !outcome || row.outcome === outcome).reduce((sum, row) => sum + row.count, 0);
    return { total: count(), completed: count("completed"), partial: count("partial"), errors: count("error"), ended: count("cancelled"), open: count("started") };
  };
  const total = counts();
  const tools = Object.keys(TOOL_GUIDES).map(tool => ({ tool, ...counts(tool) })).sort((a, b) => b.total - a.total);
  const timeline = Array.from({ length: days }, (_, index) => {
    const date = new Date((today || "2026-01-01") + "T12:00:00Z"); date.setUTCDate(date.getUTCDate() - days + index + 1);
    const day = date.toISOString().slice(0, 10);
    return { day, count: rows.filter(row => row.day === day).reduce((sum, row) => sum + row.count, 0) };
  });
  const max = Math.max(1, ...timeline.map(day => day.count));
  return <section className="admin-tool-usage" aria-busy={busy}>
    <div className="admin-usage-heading"><div><span className="tool-section-label">TOOL INSIGHTS</span><h2>{en ? "Audio tool usage" : "Nutzung der Audio-Tools"}</h2></div>
      <div><label>{en ? "Period " : "Zeitraum "}<select value={days} onChange={event => setDays(Number(event.target.value))}>{[7, 30, 90].map(value => <option key={value} value={value}>{value} {en ? "days" : "Tage"}</option>)}</select></label><button disabled={busy} onClick={() => setRefresh(value => value + 1)}>{en ? "Refresh" : "Aktualisieren"}</button></div></div>
    <p>{en ? "Browser-reported processing operations, not unique visitors. Counting starts with this update; no earlier history is reconstructed. Includes local preparation, analyses and exports. An album run counts once, not once per track." : "Vom Browser gemeldete Verarbeitungsvorgänge, keine eindeutigen Besucher. Die Zählung beginnt mit diesem Update; frühere Nutzung wird nicht nachträglich erfasst. Lokale Vorbereitung, Analysen und Exporte zählen mit. Ein Album-Durchlauf zählt einmal, nicht je Track."}</p>
    <div role="status" aria-live="polite">{busy ? (en ? "Loading statistics …" : "Statistik wird geladen …") : error}</div>
    {!busy && !error && <>
      <div className="admin-usage-kpis">{[[en ? "Operations" : "Vorgänge", total.total], [en ? "Results" : "Ergebnisse", total.completed], [en ? "Partial results" : "Unvollständig", total.partial], [en ? "Errors" : "Fehler", total.errors]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      {!total.total && <p>{en ? "No reported operations in this period yet." : "In diesem Zeitraum wurden noch keine Vorgänge gemeldet."}</p>}
      <h3>{en ? "Daily activity · Berlin time" : "Tagesverlauf · Berliner Zeit"}</h3><div className="admin-usage-chart" role="img" aria-label={timeline.map(day => `${day.day}: ${day.count}`).join(", ")}>{timeline.map(day => <div key={day.day} title={`${day.day}: ${day.count}`}><i style={{ height: `${day.count / max * 100}%` }}/></div>)}</div><div className="admin-usage-heading"><small>{timeline[0]?.day}</small><small>{today}</small></div>
      <div className="admin-usage-table"><table><caption>{en ? "Operations by tool" : "Vorgänge nach Tool"}</caption><thead><tr>{["Tool", en ? "Operations" : "Vorgänge", en ? "Result" : "Ergebnis", en ? "Partial" : "Teilweise", en ? "Error" : "Fehler", en ? "No result" : "Ohne Ergebnis", en ? "Unconfirmed" : "Unbestätigt"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{tools.map(tool => <tr key={tool.tool}><th scope="row">{TOOL_GUIDES[tool.tool].title[lang]}</th>{[tool.total, tool.completed, tool.partial, tool.errors, tool.ended, tool.open].map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div>
      <small>{en ? "No result includes preparation without a final export and discarded operations. Unconfirmed means no final browser message: still running, connection lost or tab closed. Reports may be missing or manipulated; these are not billing or verified DSP reliability figures. Records are retained for a rolling 90-day window and cleaned during subsequent statistics requests. No user IDs, filenames, audio, measurements or IP addresses are stored in these records." : "Ohne Ergebnis umfasst Vorbereitungen ohne finalen Export und verworfene Vorgänge. Unbestätigt bedeutet: keine abschließende Browsermeldung – etwa bei laufender Verarbeitung, Verbindungsabbruch oder geschlossenem Tab. Meldungen können fehlen oder manipuliert werden; keine Abrechnungs- oder verifizierte DSP-Zuverlässigkeitsstatistik. Datensätze werden für ein rollendes 90-Tage-Fenster gespeichert und bei folgenden Statistik-Aufrufen bereinigt. Keine Nutzer-IDs, Dateinamen, Audiodaten, Messwerte oder IP-Adressen in diesen Datensätzen."}</small>
    </>}
  </section>;
}
