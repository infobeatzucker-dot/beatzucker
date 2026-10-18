import Link from "next/link";
import { ArrowRight, Check, History, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { APP_VERSION, RELEASES } from "@/lib/releases";
import type { Lang } from "@/lib/types/mastering";

export default function ReleaseHistory({ lang }: { lang: Lang }) {
  const en = lang === "en";
  return <div className="release-page">
    <Header lang={lang} />
    <main className="release-main">
      <div className="release-hero">
        <span className="release-eyebrow"><History size={15} /> {en ? "BEATZUCKER UPDATES" : "BEATZUCKER UPDATES"}</span>
        <h1>{en ? "Good sound." : "Guter Sound."}<br /><em>{en ? "Always improving." : "Immer besser."}</em></h1>
        <p>{en ? "What has changed? Here are the improvements that matter to you — clearly explained, without the jargon." : "Was hat sich verändert? Hier findest du die Verbesserungen, die für dich wichtig sind – verständlich erklärt, ohne Fachchinesisch."}</p>
        <div className="release-current"><Sparkles size={16} /><span>{en ? "Current version" : "Aktuelle Version"}</span><strong>v{APP_VERSION}</strong></div>
        <Link className="release-language" href={en ? "/versionen" : "/en/updates"} lang={en ? "de" : "en"}>{en ? "Auf Deutsch lesen" : "Read in English"} <ArrowRight size={14} /></Link>
      </div>
      <div className="release-timeline">
        {RELEASES.map((release, index) => <article className="release-card" key={release.version} id={`v${release.version}`}>
          <div className="release-meta"><span className="release-version">v{release.version}</span><time dateTime={release.date}>{new Intl.DateTimeFormat(en ? "en-GB" : "de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(new Date(`${release.date}T12:00:00Z`))}</time>{index === 0 && <span className="release-latest">{en ? "Latest update" : "Neuestes Update"}</span>}</div>
          <h2>{release.title[lang]}</h2><p>{release.summary[lang]}</p>
          <ul>{release.improvements[lang].map(text => <li key={text}><Check size={17} aria-hidden="true" /><span>{text}</span></li>)}</ul>
        </article>)}
      </div>
      <p className="release-footnote">{en ? "Earlier entries were compiled from our development history and numbered retrospectively. Their dates refer to development milestones rather than individual deployment dates." : "Ältere Einträge wurden aus unserem Entwicklungsverlauf zusammengestellt und nachträglich nummeriert. Die Datumsangaben beziehen sich dort auf die Entwicklung, nicht auf einzelne Veröffentlichungstermine."}</p>
    </main>
    <Footer lang={lang} />
  </div>;
}
