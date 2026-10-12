import Link from "next/link";
import type { AnalysisData, Lang } from "@/lib/types/mastering";
import { nextStepGuidance } from "@/lib/toolGuidance";

/** Advice inside the mastering workspace must not navigate away from its loaded audio. */
export default function AnalysisNextSteps({ analysis, lang }: { analysis: AnalysisData; lang: Lang }) {
  const en = lang === "en", advice = nextStepGuidance("mix-check", lang, analysis);
  const needsReview = analysis.clipping_detected || analysis.mono_compatibility < 0.5;
  return <section className="tool-next-steps">
    <span className="tool-section-label">{en ? "AFTER YOUR ANALYSIS" : "NACH DEINER ANALYSE"}</span>
    <h2>{needsReview ? (en ? "Check your mix first." : "Prüfe zuerst deinen Mix.") : (en ? "Choose your mastering settings." : "Wähle deine Mastering-Einstellungen.")}</h2>
    <p>{needsReview ? advice?.text : en ? "Choose your platform, genre and intensity above, then start automatic mastering. Afterwards, compare original and master at matched loudness; manual adjustment lets you fine-tune and render a new master." : "Wähle oben Plattform, Genre und Intensität und starte das Auto-Mastering. Vergleiche danach Original und Master bei angepasster Lautheit; mit der manuellen Anpassung kannst du nachjustieren und einen neuen Master rendern."}</p>
    {advice && <div className="tool-guidance-links"><Link href={`${en ? "/en/knowledge" : "/ressourcen"}/${advice.article}`} target="_blank" rel="noopener noreferrer">{en ? "Read the guide (new tab)" : "Ratgeber lesen (neuer Tab)"}</Link></div>}
  </section>;
}
