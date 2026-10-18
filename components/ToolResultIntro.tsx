import { Check, AudioLines } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";
import { TOOL_GUIDES } from "@/lib/toolGuidance";

export default function ToolResultIntro({ tool, lang, analysis }: { tool: string; lang: Lang; analysis?: AnalysisData | null }) {
  const en = lang === "en";
  const exported = ["speech-cleaner","audio-converter","audio-cutter","wav-to-mp3","vocal-chain","silence-normalizer"].includes(tool);
  const duration = analysis?.duration_seconds;
  const rate = analysis?.sample_rate;
  const meta: string[] = [];
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) meta.push(`${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2,"0")}`);
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) meta.push(`${Number((rate/1000).toFixed(1))} kHz`);
  if (analysis?.channels === 1 || analysis?.channels === 2) meta.push(analysis.channels === 1 ? "Mono" : "Stereo");
  return <section className="tool-result-intro" aria-label={en ? "Result overview" : "Ergebnisübersicht"}>
    <span className="tool-result-seal" aria-hidden="true"><Check size={25}/></span>
    <div><span className="tool-section-label">{TOOL_GUIDES[tool]?.title[lang] ?? (en ? "AUDIO LAB" : "AUDIO-LABOR")}</span><h2>{en ? "Your result. In focus." : "Dein Ergebnis. Im Fokus."}</h2><p>{exported ? (en ? "Your new file is ready to download. Audition it before sharing and keep your original." : "Deine neue Datei steht zum Download bereit. Höre sie vor dem Teilen an und bewahre dein Original auf.") : en ? "Processing completed. Measurements and estimates are explained below; this is not a sound-quality rating." : "Verarbeitung abgeschlossen. Messwerte und Schätzungen werden unten erklärt – das ist keine Bewertung der Klangqualität."}</p></div>
    {meta.length > 0 && <div className="tool-result-source"><AudioLines size={18} aria-hidden="true"/><span>{en ? "Analyzed source" : "Analysierte Quelle"}<strong>{meta.join(" · ")}</strong></span></div>}
  </section>;
}
