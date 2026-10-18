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
    {article === "beatzucker-vs-andere-mastering-plattformen" && <><p>{en ? "Explore what is available now: " : "Den aktuellen Umfang selbst ausprobieren: "}<Link href={en ? "/en/tools" : "/tools"}>{en ? "All audio tools" : "Alle Audio-Tools"}</Link> · <Link href={en ? "/en/mastering-examples" : "/hoervergleich"}>{en ? "Real mastering examples" : "Echte Mastering-Hörbeispiele"}</Link> · <Link href={en ? "/en#mastering" : "/#mastering"}>{en ? "Free online mastering" : "Online Mastering kostenlos"}</Link>.</p><p>{en ? "Provider sources, checked 18 October 2026: " : "Anbieterquellen, geprüft am 18. Oktober 2026: "}<a href="https://www.landr.com/online-audio-mastering">LANDR</a> · <a href="https://emastered.com/">eMastered</a>. {en ? "Public product descriptions, not independent quality measurements. Check current plans directly." : "Öffentliche Produktbeschreibungen, keine unabhängigen Qualitätsmessungen. Aktuelle Tarife bitte direkt prüfen."}</p></>}
    {article === "lufs-erklaert" && <p>{en ? "Further reading: " : "Zum Nachlesen: "}<a href="https://support.spotify.com/nl-en/artists/article/loudness-normalization/">Spotify: {en ? "loudness normalization" : "Lautheitsnormalisierung"}</a>. {en ? "Playback behaviour depends on settings; the streaming preview is an estimate, not the platform player." : "Die Wiedergabe hängt von Einstellungen ab; die Streaming-Vorschau ist eine Schätzung, nicht der Plattform-Player."}</p>}
    {article === "sample-rate-bit-depth" && <p>{en ? "Further reading: " : "Zum Nachlesen: "}<a href="https://www.izotope.com/community/blog/digital-audio-basics-sample-rate-and-bit-depth">iZotope: {en ? "sample rate and bit depth" : "Sample-Rate und Bittiefe"}</a> · <a href="https://downloads.izotope.com/docs/rx6/39-dither/index.html">{en ? "Dither documentation" : "Dither-Dokumentation"}</a>.</p>}
    {["lufs-erklaert", "true-peak-rms-lufs", "was-ist-audio-mastering", "mastering-vs-mixing", "re-beatz-online-mastering-mit-kontrolle"].includes(article) && <p>{en ? "Want to hear the difference before uploading your own track? " : "Du möchtest den Unterschied erst hören, bevor du deinen eigenen Track hochlädst? "}<Link href={en ? "/en/mastering-examples" : "/hoervergleich"}>{en ? "Compare real original mixes and masters" : "Echte Original-Mixe und Master vergleichen"}</Link>.</p>}
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
    <p><Link href={en ? "/en/mastering-examples" : "/hoervergleich"}>{en ? "Listen to real mastering examples with measured excerpt values" : "Echte Mastering-Hörbeispiele mit gemessenen Ausschnittwerten anhören"}<ArrowRight size={15}/></Link></p>
  </section>;
}
