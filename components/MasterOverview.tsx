import type { AnalysisData, Lang } from "@/lib/types/mastering";
export interface MasterOverviewData { filename: string; before: Pick<AnalysisData, "integrated_lufs">; after: Pick<AnalysisData, "integrated_lufs" | "true_peak"> & Partial<Pick<AnalysisData, "lra">> }
function measured(value: number | undefined, lang: Lang) { return Number.isFinite(value) ? value!.toFixed(1).replace(".", lang === "de" ? "," : ".") : "—"; }
export default function MasterOverview({ result, lang }: { result: MasterOverviewData; lang: Lang }) {
  return <aside className="master-overview" aria-label={lang === "de" ? "Dein Master im Überblick" : "Your master at a glance"}>
    <div className="master-overview-eyebrow">MASTER / READY <i aria-hidden="true" /></div>
    <svg className="master-overview-art" viewBox="0 0 320 140" fill="none" aria-hidden="true">
      <ellipse cx="160" cy="70" rx="123" ry="34" stroke="#8a9bed" strokeOpacity=".25" transform="rotate(-12 160 70)" />
      <ellipse cx="160" cy="70" rx="112" ry="42" stroke="#8ed6e9" strokeOpacity=".3" transform="rotate(14 160 70)" />
      {Array.from({ length: 35 }, (_, i) => { const height = 8 + Math.sin(i / 34 * Math.PI) * (13 + 36 * Math.abs(Math.sin(i * .65))); return <path key={i} d={`M${58 + i * 6} ${70 - height / 2}v${height}`} stroke={i < 17 ? "#af99ed" : "#8adbe6"} strokeWidth="2" strokeLinecap="round" opacity=".8" />; })}
    </svg>
    <span className="master-overview-art-note">{lang === "de" ? "Klangmotiv · dekorative Darstellung" : "Sound motif · decorative illustration"}</span>
    <h2>{lang === "de" ? "Dein Sound. Veredelt." : "Your sound. Refined."}</h2>
    <p className="master-overview-filename" title={result.filename}>{result.filename}</p>
    <dl className="master-overview-metrics">
      <div><dt>Original</dt><dd>{measured(result.before.integrated_lufs, lang)} <small>LUFS</small></dd></div>
      <div><dt>Master</dt><dd>{measured(result.after.integrated_lufs, lang)} <small>LUFS</small></dd></div>
      <div><dt>{lang === "de" ? "Spitzenpegel" : "True peak"}</dt><dd>{measured(result.after.true_peak, lang)} <small>dBTP</small></dd></div>
      <div><dt>{lang === "de" ? "Lautheitsumfang" : "Loudness range"}</dt><dd>{measured(result.after.lra, lang)} <small>LU</small></dd></div>
    </dl>
    <p className="master-overview-note">{lang === "de" ? "Gemessene Werte deines fertigen Masters. Mehr Lautheit allein bedeutet nicht automatisch besseren Klang – nutze den A/B-Vergleich." : "Measured values from your finished master. Louder does not automatically mean better – use the A/B comparison."}</p>
  </aside>;
}
