import Link from "next/link";
import { Activity, ArrowRight, AudioLines, Disc3, Gauge, Mic2, Radio, Sparkles, Waves } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

const planned = [
  { icon: Disc3, de: "Album-Konsistenz", en: "Album consistency" },
  { icon: AudioLines, de: "Referenz-Vergleich", en: "Reference comparison" },
  { icon: Mic2, de: "Vocal Mix Check", en: "Vocal mix check" },
  { icon: Waves, de: "Stereo- & Phasenlabor", en: "Stereo & phase lab" },
];

export default function ToolsHub({ lang }: { lang: Lang }) {
  const en = lang === "en";
  return <>
    <section className="tools-hero">
      <span className="tools-kicker"><Sparkles size={14} /> BEATZUCKER AUDIO LAB</span>
      <h1>{en ? <>Useful tools for <em>better releases.</em></> : <>Nützliche Tools für <em>bessere Releases.</em></>}</h1>
      <p>{en ? "Analyze, preview and prepare your music directly in the browser — technically transparent and without permanent audio storage." : "Analysiere, simuliere und bereite deine Musik direkt im Browser vor – technisch transparent und ohne dauerhafte Audiospeicherung."}</p>
    </section>
    <section className="tools-grid">
      <Link className="tool-card tool-card-featured" href={en ? "/en/tools/streaming-preview" : "/tools/streaming-preview"}>
        <div className="tool-card-icon"><Radio size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>{en ? "Streaming Preview" : "Streaming-Vorschau"}</h2>
        <p>{en ? "Hear platform loudness normalization and check true-peak and codec headroom before release." : "Höre die Plattform-Normalisierung und prüfe True Peak sowie Codec-Headroom vor dem Release."}</p>
        <div className="tool-tags"><span>LUFS</span><span>True Peak</span><span>Codec Risk</span></div>
        <strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16} /></strong>
      </Link>
      <Link className="tool-card" href={en ? "/en/mix-check" : "/mix-check"}>
        <div className="tool-card-icon"><Activity size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>Mix-Check</h2>
        <p>{en ? "Check headroom, dynamics, clipping, mono compatibility and technical file data." : "Prüfe Headroom, Dynamik, Clipping, Mono-Kompatibilität und technische Dateidaten."}</p>
        <div className="tool-tags"><span>Headroom</span><span>DR</span><span>Phase</span></div>
        <strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16} /></strong>
      </Link>
      {planned.map(({ icon: Icon, de, en: label }) => <article className="tool-card tool-card-soon" key={de}>
        <div className="tool-card-icon"><Icon size={25} /></div><span className="tool-status">{en ? "PLANNED" : "GEPLANT"}</span>
        <h2>{en ? label : de}</h2><p>{en ? "This tool is next on the Beatzucker Audio Lab roadmap." : "Dieses Tool steht als Nächstes auf der Roadmap des Beatzucker Audio Lab."}</p>
      </article>)}
    </section>
    <section className="tools-principles"><Gauge size={22} /><div><strong>{en ? "Measurements, not magic." : "Messwerte statt Magie."}</strong><span>{en ? "Every result explains what was measured and what is only an estimate." : "Jedes Ergebnis erklärt, was gemessen wurde und was lediglich eine Prognose ist."}</span></div></section>
  </>;
}
