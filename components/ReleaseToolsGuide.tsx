import Link from "next/link";
import { AUDIO_RELEASE_TOOLS, releaseToolHref, releaseToolSlugs } from "@/lib/releaseTools";
import type { Lang } from "@/lib/types/mastering";

export default function ReleaseToolsGuide({lang}: {lang:Lang}) {
  const en=lang==="en";
  return <section className="glass-panel p-6 mt-8" aria-label={en?"Tools for your release":"Tools für deinen Release"}>
    <h2 className="text-xl font-bold mb-4">{en?"From comparison to release":"Vom Vergleich zum Release"}</h2>
    <ol className="grid md:grid-cols-2 gap-4 text-sm">
      {releaseToolSlugs.map(slug=><li key={slug}><strong><Link href={releaseToolHref(slug,lang)}>{AUDIO_RELEASE_TOOLS[slug][lang].title} →</Link></strong><p>{AUDIO_RELEASE_TOOLS[slug][lang].summary}</p></li>)}
      <li><strong><Link href={(en?"/en":"")+"/tools/kick-bass-sidechain"}>{en?"Kick & bass with stems →":"Kick & Bass mit Einzelspuren →"}</Link></strong>
        <p>{en?"Let the kick trigger bass-only ducking. Audition locally and download the processed bass after activation.":"Lass die Kick die Absenkung nur auf der Bassspur auslösen. Lokal hören und den bearbeiteten Bass nach Freischaltung herunterladen."}</p></li>
    </ol>
    <p className="text-sm mt-4"><Link href={(en?"/en/knowledge":"/ressourcen")+"/master-vergleichen-und-veroeffentlichen"}>{en?"Read five practical examples →":"Fünf Praxisbeispiele lesen →"}</Link></p>
  </section>;
}
