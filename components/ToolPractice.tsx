import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import { TOOL_GUIDES, toolHref } from "@/lib/toolGuidance";

export function ToolPractice({ tool, lang }: { tool: string; lang: Lang }) {
  const guide = TOOL_GUIDES[tool];
  if (!guide) return null;
  const en = lang === "en";
  return <article className="tool-practice"><span className="tool-section-label">{en ? "PRACTICAL EXAMPLE · ILLUSTRATIVE, NOT A TEST RESULT" : "PRAXISBEISPIEL · VERANSCHAULICHUNG, KEIN TESTERGEBNIS"}</span>
    <h3>{guide.situation[lang]}</h3><ol><li><strong>{en ? "Try this: " : "So gehst du vor: "}</strong>{guide.action[lang]}</li>
      <li><strong>{en ? "How to interpret it: " : "So ordnest du es ein: "}</strong>{guide.interpretation[lang]}</li></ol>
  </article>;
}

export function KnowledgeTools({ article, lang }: { article: string; lang: Lang }) {
  const matches = Object.entries(TOOL_GUIDES).filter(([, guide]) => guide.articles.includes(article)).slice(0, 3);
  if (!matches.length) return null;
  const en = lang === "en";
  return <section className="knowledge-tools"><span className="tool-section-label">{en ? "FROM THEORY TO PRACTICE" : "VON DER THEORIE ZUR PRAXIS"}</span>
    <h2>{en ? "Try it with your own audio." : "Probiere es mit deinem Audio aus."}</h2>
    <p>{en ? "These free tools help you apply the guide. Measurements are starting points, not automatic mixing decisions." : "Mit diesen kostenlosen Tools wendest du den Ratgeber an. Messwerte sind Ausgangspunkte, keine automatischen Mixentscheidungen."}</p>
    <div className="tool-guidance-links">{matches.map(([slug, guide]) => <Link key={slug} href={toolHref(slug, lang)}>{guide.title[lang]}<ArrowRight size={16}/></Link>)}</div>
  </section>;
}

export function PracticeHub({ lang }: { lang: Lang }) {
  const en = lang === "en";
  return <section className="practice-hub"><h2>{en ? "Learn it. Try it. Hear the difference." : "Verstehen. Ausprobieren. Bewusst hören."}</h2>
    <p>{en ? "Start with a real production question and connect the explanation with the matching tool." : "Starte mit einer konkreten Produktionsfrage und verbinde die Erklärung mit dem passenden Tool."}</p>
    <div className="practice-hub-grid">{["streaming-preview", "kick-bass-conflict", "stereo-phase"].map(slug => <article key={slug}>
      <h3>{TOOL_GUIDES[slug].situation[lang]}</h3><div className="tool-guidance-links"><Link href={toolHref(slug, lang)}>{TOOL_GUIDES[slug].title[lang]}<ArrowRight size={16}/></Link>
        <Link href={`${en ? "/en/knowledge" : "/ressourcen"}/${TOOL_GUIDES[slug].articles[0]}`}>{en ? "Understand the background" : "Hintergrund verstehen"}</Link></div>
    </article>)}</div>
  </section>;
}
