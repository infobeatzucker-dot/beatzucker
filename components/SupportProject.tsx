import Link from "next/link";
import { Heart, Server, Clock, ArrowUpRight, Music2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DAILY_MASTER_LIMIT, DONATE_URL } from "@/lib/constants";
import type { Lang } from "@/lib/types/mastering";

export default function SupportProject({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const cards = en ? [
    { icon: Server, title: "Servers don't run for free", text: "Every analysis, preview and master needs computing power, storage and bandwidth. These ongoing costs grow as more musicians use Beatzucker." },
    { icon: Clock, title: "A lot of time behind the scenes", text: "Development, listening tests, bug fixes and support take time. We continually work on making the tools more useful and reliable." },
    { icon: Music2, title: "Room for more music", text: "More server capacity could let more people master their music and help us increase the number of free masters available in the future." },
  ] : [
    { icon: Server, title: "Server laufen nicht kostenlos", text: "Jede Analyse, jede Vorschau und jeder Master benötigen Rechenleistung, Speicher und Datenübertragung. Diese laufenden Kosten wachsen mit der Zahl der Musiker, die Beatzucker nutzen." },
    { icon: Clock, title: "Viel Zeit hinter den Kulissen", text: "Entwicklung, Hörtests, Fehlerbehebung und Unterstützung kosten Zeit. Wir arbeiten laufend daran, die Werkzeuge nützlicher und zuverlässiger zu machen." },
    { icon: Music2, title: "Mehr Platz für deine Musik", text: "Mit zusätzlichen Serverkapazitäten können wir mehr Musikern das Mastering ermöglichen und möchten künftig auch die Anzahl der kostenlosen Masters erhöhen." },
  ];
  return <div className="release-page"><Header lang={lang} /><main className="release-main">
    <div className="release-hero"><span className="release-eyebrow"><Heart size={15} />{en ? "A NOTE FROM US" : "IN EIGENER SACHE"}</span>
      <h1>{en ? "Free for your music." : "Kostenlos für deine Musik."}<br /><em>{en ? "Supported by you." : "Getragen von euch."}</em></h1>
      <p>{en ? "Beatzucker is free — and we want to keep it that way. No subscription, no paid mastering tier. But building and running the project costs real money and a great deal of time." : "Beatzucker ist kostenlos – und soll es bleiben. Ohne Abo, ohne kostenpflichtige Mastering-Stufe. Die Entwicklung und der Betrieb kosten trotzdem echtes Geld und viel Zeit."}</p>
      <Link className="release-language" href={en ? "/in-eigener-sache" : "/en/support"} lang={en ? "de" : "en"}>{en ? "Auf Deutsch lesen" : "Read in English"} <ArrowUpRight size={14} /></Link>
    </div>
    <div className="support-grid">{cards.map(({ icon: Icon, title, text }) => <section className="release-card" key={title}><Icon size={25} className="support-icon" /><h2>{title}</h2><p>{text}</p></section>)}</div>
    <section className="release-card support-callout"><span className="release-eyebrow"><Heart size={16} />{en ? "YOUR SUPPORT MAKES A DIFFERENCE" : "DEINE UNTERSTÜTZUNG MACHT DEN UNTERSCHIED"}</span>
      <h2>{en ? "Help us keep Beatzucker free." : "Hilf mit, Beatzucker kostenlos zu halten."}</h2>
      <p>{en ? "We rely on ongoing financial support and voluntary donations to cover server costs, maintain the project and build capacity for the future. Every contribution, large or small, helps." : "Um Serverkosten zu tragen, das Projekt weiterzuentwickeln und zusätzliche Kapazitäten aufzubauen, sind wir auf laufende finanzielle Unterstützung und freiwillige Spenden angewiesen. Jeder Beitrag hilft – ob klein oder groß."}</p>
      <a className="support-donate" href={DONATE_URL} target="_blank" rel="noopener noreferrer"><Heart size={18} />{en ? "Support Beatzucker via PayPal" : "Beatzucker über PayPal unterstützen"}<ArrowUpRight size={17} /></a>
      <p className="support-fineprint">{en ? "Donating is entirely optional. It does not unlock extra masters or preferential processing. You are welcome to use Beatzucker without donating." : "Spenden sind vollkommen freiwillig. Sie schalten keine zusätzlichen Masters oder bevorzugte Bearbeitung frei. Du kannst Beatzucker selbstverständlich auch ohne Spende nutzen."}</p>
    </section>
    <section className="release-card support-callout"><h2>{en ? "More capacity is our goal, not a promise." : "Mehr Kapazität ist unser Ziel, kein leeres Versprechen."}</h2>
      <p>{en ? `The current fair-use limit is ${DAILY_MASTER_LIMIT} masters per account per day. This protects the service against overload. With enough support and reliable additional capacity, we want to raise that limit. There is no fixed date or guaranteed increase yet.` : `Aktuell gilt ein Fair-Use-Limit von ${DAILY_MASTER_LIMIT} Masters pro Konto und Tag. Das schützt den Dienst vor Überlastung. Mit ausreichender Unterstützung und zuverlässig verfügbaren zusätzlichen Kapazitäten möchten wir dieses Limit erhöhen. Einen festen Termin oder eine garantierte Erhöhung gibt es dafür noch nicht.`}</p>
      <p>{en ? "Can't contribute financially? Sharing Beatzucker with fellow musicians, reporting problems and giving thoughtful feedback also helps. Thank you for being part of the project." : "Du kannst gerade nichts spenden? Auch Weiterempfehlungen an andere Musiker, Hinweise auf Probleme und ehrliches Feedback helfen uns weiter. Danke, dass du Teil des Projekts bist."}</p>
    </section>
  </main><Footer lang={lang} /></div>;
}
