import type { AnalysisData, Lang } from "@/lib/types/mastering";
import MasterSignatureArtwork from "@/components/MasterSignatureArtwork";
export interface MasterOverviewData { filename: string; before: Pick<AnalysisData, "integrated_lufs">; after: Pick<AnalysisData, "integrated_lufs" | "true_peak"> & Partial<Pick<AnalysisData, "lra">> }
function measured(value: number | undefined, lang: Lang) { return Number.isFinite(value) ? value!.toFixed(1).replace(".", lang === "de" ? "," : ".") : "—"; }
export default function MasterOverview({ result, lang }: { result: MasterOverviewData; lang: Lang }) {
  return <aside className="master-overview" aria-label={lang === "de" ? "Dein Master im Überblick" : "Your master at a glance"}>
    <div className="master-overview-eyebrow"><span><i aria-hidden="true" /> {lang === "de" ? "DEIN MASTER IST FERTIG" : "YOUR MASTER IS COMPLETE"}</span><span>BEATZUCKER</span></div>
    <MasterSignatureArtwork />
    <h2 className="master-signature-title">MASTERED<span aria-hidden="true">.</span></h2>
    <p className="master-overview-filename" title={result.filename}>{result.filename}</p>
    <dl className="master-overview-metrics">
      <div><dt>Original</dt><dd>{measured(result.before.integrated_lufs, lang)} <small>LUFS</small></dd></div>
      <div><dt>Master</dt><dd>{measured(result.after.integrated_lufs, lang)} <small>LUFS</small></dd></div>
      <div><dt>{lang === "de" ? "Spitzenpegel" : "True peak"}</dt><dd>{measured(result.after.true_peak, lang)} <small>dBTP</small></dd></div>
      <div><dt>{lang === "de" ? "Lautheitsumfang" : "Loudness range"}</dt><dd>{measured(result.after.lra, lang)} <small>LU</small></dd></div>
    </dl>
    <p className="master-overview-note">{lang === "de" ? "Gemessene Werte · Klangmotiv: dekorative Darstellung, kein Live-Analyzer." : "Measured values · Sound motif: decorative illustration, not a live analyzer."}</p>
  </aside>;
}
