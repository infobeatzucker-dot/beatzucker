import Header from "./Header";
import Footer from "./Footer";
import StemTool from "./StemTool";
import Link from "next/link";
import type { Lang } from "@/lib/types/mastering";
export default function StemToolPage({ lang, tool }: { lang: Lang; tool: "vocal-remover" | "stem-separation" }) {
  const en = lang === "en", vocal = tool === "vocal-remover";
  const tools = en ? "/en/tools" : "/tools";
  return <div className="tools-page"><Header lang={lang}/><main>
    <StemTool lang={lang} tool={tool}/>
    <section className="stem-guide" aria-labelledby="stem-guide-heading">
      <h2 id="stem-guide-heading">{vocal
        ? (en ? "How to separate vocals and instrumental" : "So trennst du Gesang und Instrumental")
        : (en ? "How to split a song into four stems" : "So teilst du einen Song in vier Stems")}</h2>
      <p>{vocal
        ? (en ? "The Vocal Remover separates a finished mix into a vocals track and an instrumental. Try Solo on the demo vocals to hear the isolated voice, then Solo the instrumental to hear what remains." : "Der Vocal Remover trennt einen fertigen Mix in eine Gesangsspur und ein Instrumental. Schalte im Demosong zuerst die Stimme auf Solo und höre danach das Instrumental einzeln ab.")
        : (en ? "The stem splitter separates a mixed song into vocals, drums, bass and other instruments. Solo the bass and then bring in the drums to hear how the rhythm section fits together." : "Der Stem Splitter trennt einen fertigen Mix in Gesang, Drums, Bass und weitere Instrumente. Höre den Bass zunächst solo und schalte anschließend die Drums dazu, um die Rhythmusgruppe zu prüfen.")}</p>
      <p>{en
        ? "Sign in to try the first 20 seconds of your own file when the separation service is available. Full-track processing and WAV downloads require individual access. Separation quality varies with the mix, and some bleed can remain."
        : "Wenn der Trennungsdienst verfügbar ist, kannst du nach Anmeldung die ersten 20 Sekunden deiner eigenen Datei testen. Vollständige Songs und WAV-Downloads erfordern eine persönliche Freischaltung. Je nach Mix kann etwas Übersprechen bleiben."}</p>
      <ul>
        <li><Link href={`${tools}/${vocal ? "stem-separation" : "vocal-remover"}#demo`}>{vocal ? (en ? "Try the four-stem mixer" : "Mischpult mit vier Stems ausprobieren") : (en ? "Try vocals and instrumental" : "Gesang und Instrumental ausprobieren")}</Link></li>
        <li><Link href={`${tools}/vocal-chain`}>{en ? "Polish a vocal with Vocal Chain" : "Gesang mit Vocal Chain bearbeiten"}</Link></li>
        <li><Link href={en ? "/en/knowledge#studio-guide" : "/ressourcen#studio-guide"}>{en ? "Guide to the studio tools" : "Anleitung zu den Studio-Tools"}</Link></li>
      </ul>
    </section>
  </main><Footer lang={lang}/></div>;
}
