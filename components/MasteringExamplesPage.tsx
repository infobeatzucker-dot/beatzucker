import Link from "next/link";
import { ArrowRight, AudioLines, Headphones, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MasteringListeningShowcase from "@/components/MasteringListeningShowcase";
import { readShowcase } from "@/lib/showcasePublication";
import { validShowcaseTrack } from "@/lib/showcaseTracks";
import type { Lang } from "@/lib/types/mastering";
import "./mastering-examples.css";

export default async function MasteringExamplesPage({ lang }: { lang: Lang }) {
  const en = lang === "en", url = `https://beatzucker.de${en ? "/en/mastering-examples" : "/hoervergleich"}`;
  // Read the same current publication as the admin and homepage, never a second copy.
  const { tracks } = await readShowcase();
  if (tracks.length < 1 || tracks.length > 5 || !tracks.every(validShowcaseTrack)) throw Error("Invalid listening publication");
  const title = en ? "Audio mastering: before and after" : "Audio-Mastering: Vorher und nachher";
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": url, url, name: title, inLanguage: en ? "en" : "de-DE", isPartOf: { "@id": "https://beatzucker.de/#website" }, mainEntity: { "@id": `${url}#examples` } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: en ? "Home" : "Startseite", item: `https://beatzucker.de${en ? "/en" : "/"}` },
      { "@type": "ListItem", position: 2, name: en ? "Mastering examples" : "Hörvergleich", item: url },
    ] },
    { "@type": "ItemList", "@id": `${url}#examples`, numberOfItems: tracks.length, itemListElement: tracks.map((track, index) => ({
      "@type": "ListItem", position: index + 1, item: { "@type": "MusicRecording", name: track.title, genre: track.genre, url: `${url}#example-${track.id}`, duration: "PT24S", associatedMedia: (["original", "master"] as const).map(side => ({
        "@type": "AudioObject", name: `${track.title} — ${side === "original" ? "Original" : "Beatzucker Master"}`, contentUrl: `https://beatzucker.de${track[side].url}`, encodingFormat: "audio/mpeg", duration: "PT24S", contentSize: String(track[side].bytes), description: en ? "24-second aligned excerpt, not the complete song." : "Zeitlich ausgerichteter 24-Sekunden-Ausschnitt, nicht der vollständige Song.",
      })) },
    })) },
  ] };
  const number = (value: number) => value.toLocaleString(en ? "en-US" : "de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const time = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  const knowledge = en ? "/en/knowledge" : "/ressourcen";
  return <div className="mastering-examples-page" lang={lang}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/>
    <Header lang={lang}/>
    <main>
      <header className="examples-hero">
        <nav className="examples-breadcrumb" aria-label={en ? "Breadcrumb" : "Brotkrümelnavigation"}><Link href={en ? "/en" : "/"}>{en ? "Home" : "Startseite"}</Link><span aria-hidden="true">/</span><span>{en ? "Mastering examples" : "Hörvergleich"}</span></nav>
        <nav className="examples-language" aria-label={en ? "Page language" : "Seitensprache"}><Link href="/hoervergleich" hrefLang="de" aria-current={!en ? "page" : undefined}>Deutsch</Link><Link href="/en/mastering-examples" hrefLang="en" aria-current={en ? "page" : undefined}>English</Link></nav>
        <span className="examples-eyebrow"><Headphones size={16}/>{en ? "REAL MUSIC · REAL COMPARISONS" : "ECHTE MUSIK · ECHTE VERGLEICHE"}</span>
        <h1>{en ? <>Audio mastering.<br/><em>Before and after.</em></> : <>Audio-Mastering.<br/><em>Vorher und nachher.</em></>}</h1>
        <p>{en ? "Hear original mixes alongside their Beatzucker masters. Switch at the same position, compare original levels or match loudness, and use the measured excerpt values as context—not a score for musical quality." : "Höre Original-Mixe neben ihren Beatzucker-Mastern. Wechsle an derselben Stelle, vergleiche Originalpegel oder gleiche die Lautheit an. Die gemessenen Ausschnittwerte helfen beim Einordnen – sie sind keine Bewertung musikalischer Qualität."}</p>
        <a className="examples-primary" href="#before-after">{en ? "Listen to the examples" : "Hörbeispiele starten"}<ArrowRight size={17}/></a>
        <span className="examples-access"><ShieldCheck size={14}/>{en ? "No account needed to listen. Playback starts only when you press play." : "Anhören ohne Konto. Wiedergabe startet erst mit deinem Klick auf Play."}</span>
      </header>
      <MasteringListeningShowcase lang={lang} initialTracks={tracks}/>
      <section className="examples-content" aria-labelledby="examples-reading">
        <div className="examples-section-heading"><AudioLines size={20}/><div><span className="examples-eyebrow">{en ? "LISTEN FIRST. READ SECOND." : "ERST HÖREN. DANN EINORDNEN."}</span><h2 id="examples-reading">{en ? "What should you listen for?" : "Worauf solltest du beim Vergleich achten?"}</h2></div></div>
        <div className="examples-guide-grid">
          <article><b>01</b><h3>{en ? "Separate loudness from tone" : "Lautheit von Klang trennen"}</h3><p>{en ? "Original levels make the loudness change audible. Switch to level matching, then compare tonal balance, detail and space. A louder version is not automatically the better one." : "Mit Originalpegel hörst du auch den Lautheitsunterschied. Schalte danach auf Lautheitsabgleich und vergleiche Klangbalance, Details und Räumlichkeit. Lauter ist nicht automatisch besser."}</p><Link href={`${knowledge}/lufs-erklaert`}>{en ? "Understand LUFS" : "LUFS verstehen"}<ArrowRight size={14}/></Link></article>
          <article><b>02</b><h3>{en ? "Follow transients and balance" : "Anschläge und Balance verfolgen"}</h3><p>{en ? "Listen to kick and snare attacks, bass definition and how vocals sit in the mix. Notice whether quiet details remain clear. Different mixes need different decisions; no single loudness target suits every song." : "Achte auf Kick- und Snare-Anschläge, die Kontur des Basses und die Einbettung der Stimme. Bleiben leise Details verständlich? Unterschiedliche Mixe brauchen unterschiedliche Entscheidungen; ein Lautheitsziel passt nicht zu jedem Song."}</p><Link href={`${knowledge}/mastering-vs-mixing`}>{en ? "Mixing vs. mastering" : "Mixing und Mastering unterscheiden"}<ArrowRight size={14}/></Link></article>
          <article><b>03</b><h3>{en ? "Check beyond the excerpt" : "Über den Ausschnitt hinaus prüfen"}</h3><p>{en ? "These are 24-second excerpts supplied by the operator, not blind tests or promises for your own mix. For your release, check the complete export, quieter passages and different playback systems. Compare codecs when relevant." : "Hier hörst du vom Betreiber bereitgestellte 24-Sekunden-Ausschnitte, keine Blindtests oder Versprechen für deinen Mix. Prüfe für deinen Release den ganzen Export, leisere Stellen und unterschiedliche Wiedergabesysteme. Vergleiche bei Bedarf auch Codecs."}</p><Link href={en ? "/en/tools/streaming-preview" : "/tools/streaming-preview"}>{en ? "Try the streaming preview" : "Streaming-Vorschau ausprobieren"}<ArrowRight size={14}/></Link></article>
        </div>
      </section>
      <section className="examples-content examples-measured" aria-labelledby="examples-values">
        <span className="examples-eyebrow">{en ? "MEASURED, NOT GUESSED" : "GEMESSEN, NICHT GESCHÄTZT"}</span><h2 id="examples-values">{en ? "The excerpts and their measurements" : "Die Ausschnitte und ihre Messwerte"}</h2>
        <p>{en ? "Values describe the published MP3 excerpts before optional playback level matching. LUFS measures average loudness; true peak estimates peak level including inter-sample peaks; crest is the difference between sample peak and RMS. None of these numbers alone proves better sound." : "Die Werte beschreiben die veröffentlichten MP3-Hörproben vor dem optionalen Lautheitsabgleich. LUFS misst die mittlere Lautheit; True Peak schätzt Spitzen einschließlich Zwischensample-Peaks; Crest bezeichnet den Abstand zwischen Sample-Spitze und RMS. Keiner dieser Werte allein beweist besseren Klang."}</p>
        <div className="examples-track-grid">{tracks.map((track, index) => <article key={track.id} id={`example-${track.id}`}>
          <span className="examples-track-number">{String(index + 1).padStart(2,"0")} / {track.genre}</span><h3>{track.title}</h3><p>{time(track.sourceStart)}–{time(track.sourceStart+track.duration)} · {en ? "24-second excerpt" : "24-Sekunden-Ausschnitt"}</p>
          <div className="examples-table-scroll"><table><caption>{en ? `Measured original and master excerpts: ${track.title}` : `Gemessene Original- und Master-Hörprobe: ${track.title}`}</caption><thead><tr><th scope="col">{en ? "Value" : "Messwert"}</th><th scope="col">Original</th><th scope="col">Master</th></tr></thead><tbody>{([{ key:"lufs", label:"LUFS", unit:"LUFS" },{ key:"truePeak", label:"True Peak", unit:"dBTP" },{ key:"crest", label:"Crest", unit:"dB" }] as const).map(metric => <tr key={metric.key}><th scope="row">{metric.label}</th><td>{number(track.original.metrics[metric.key])} <small>{metric.unit}</small></td><td>{number(track.master.metrics[metric.key])} <small>{metric.unit}</small></td></tr>)}</tbody></table></div>
          <div className="examples-file-links"><a href={track.original.url}>{en ? "Open original excerpt" : "Original-Hörprobe öffnen"}</a><a href={track.master.url}>{en ? "Open master excerpt" : "Master-Hörprobe öffnen"}</a></div>
        </article>)}</div>
        <p className="examples-method">{en ? "Preparation: time alignment, identical short edge fades and MP3 320 kbps encoding for both sides. No additional mastering or stored loudness normalization is applied to these previews. This is not a lossless comparison. Source formats and individual mastering settings may differ." : "Aufbereitung: zeitliche Ausrichtung, gleiche kurze Randblenden und MP3-320-kbps-Kodierung für beide Seiten. Keine zusätzliche Mastering-Bearbeitung oder gespeicherte Lautheitsnormalisierung der Hörproben. Dies ist kein verlustfreier Vergleich. Quellformate und individuelle Mastering-Einstellungen können sich unterscheiden."}</p>
        <Link href={`${knowledge}/true-peak-rms-lufs`}>{en ? "Read about true peak, RMS and LUFS" : "True Peak, RMS und LUFS genauer verstehen"}<ArrowRight size={14}/></Link>
      </section>
      <section className="examples-content examples-next"><div><span className="examples-eyebrow">{en ? "YOUR MUSIC. YOUR DECISION." : "DEINE MUSIK. DEINE ENTSCHEIDUNG."}</span><h2>{en ? "Ready to check your own track?" : "Bereit für deinen eigenen Track?"}</h2><p>{en ? "Start with the public Mix Check or sign in to master your own song. Manual fine-tuning lets you adjust the result afterwards." : "Starte mit dem öffentlichen Mix-Check oder melde dich an, um deinen eigenen Song zu mastern. Mit der manuellen Feinabstimmung passt du das Ergebnis anschließend an."}</p></div><div className="examples-next-links"><Link href={en ? "/en/mix-check" : "/mix-check"}>{en ? "Check my mix" : "Meinen Mix prüfen"}<ArrowRight size={16}/></Link><Link href={en ? "/en#mastering" : "/#mastering"}>{en ? "Go to mastering" : "Zum Mastering"}<ArrowRight size={16}/></Link></div></section>
    </main><Footer lang={lang}/>
  </div>;
}
