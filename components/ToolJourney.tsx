import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { AnalysisData, Lang } from "@/lib/types/mastering";
import { nextStepGuidance, TOOL_GUIDES, toolHref } from "@/lib/toolGuidance";
import ToolFeedback from "./ToolFeedback";

export default function ToolJourney({ tool, lang, busy, complete, incomplete = false, error, progress, analysis, onRetry, mode = "all" }: {
  tool: string; lang: Lang; busy: boolean; complete: boolean; incomplete?: boolean;
  error?: string; progress?: string; analysis?: AnalysisData | null; onRetry?: () => void; mode?: "all" | "feedback" | "recommendations";
}) {
  const en = lang === "en", next = nextStepGuidance(tool, lang, analysis);
  const state = busy ? "working" : error ? "error" : incomplete ? "warning" : complete ? "success" : "idle";
  return <>
    {mode !== "recommendations" && <ToolFeedback lang={lang} state={state} onRetry={onRetry} detail={busy ? progress || (en ? "Please wait. Long files may take longer; no completion time is estimated." : "Bitte warten. Lange Dateien können länger dauern; es wird keine Restzeit geschätzt.") : error || (incomplete ? (en ? "Some measurements are missing. Review the details and try again where needed." : "Messwerte fehlen. Prüfe die Details und wiederhole die betroffenen Analysen.") : complete ? (en ? "Your result is available below. Completed does not mean your audio is free of issues." : "Dein Ergebnis steht unten bereit. Abgeschlossen bedeutet nicht, dass dein Audio fehlerfrei ist.") : undefined)}/>}
    {mode !== "feedback" && complete && !busy && !error && !incomplete && next && <section className="tool-next-steps" aria-label={en ? "Next steps" : "Nächste Schritte"}>
      <span className="tool-section-label">{en ? "YOUR NEXT STEP" : "DEIN NÄCHSTER SCHRITT"}</span>
      <h2>{en ? "Put the result to use." : "Nutze dein Ergebnis."}</h2><p>{next.text}</p>
      <div className="tool-guidance-links">{next.tools.map(slug => <Link key={slug} href={toolHref(slug, lang)}>{TOOL_GUIDES[slug].title[lang]}<ArrowRight size={16}/></Link>)}
        <Link href={`${en ? "/en/knowledge" : "/ressourcen"}/${next.article}`}><BookOpen size={16}/>{en ? "Read the matching guide" : "Passenden Ratgeber lesen"}</Link>
      </div>
      <small>{en ? "Files and settings are not carried over. Choose the relevant file again in the next tool." : "Dateien und Einstellungen werden nicht übertragen. Wähle die passende Datei im nächsten Tool erneut aus."}</small>
    </section>}
  </>;
}
