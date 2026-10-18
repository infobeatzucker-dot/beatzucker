import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
const utilities=[{slug:"speech-cleaner",de:"Rauschen aus Sprache reduzieren",en:"Reduce noise in voice recordings"},{slug:"audio-cutter",de:"Audio schneiden und Fades setzen",en:"Cut audio and add fades"},{slug:"wav-to-mp3",de:"WAV als MP3 teilen",en:"Share WAV as MP3"}];
export default function AudioUtilityLinks({tool,lang}:{tool:string;lang:Lang}){
  if(!utilities.some(item=>item.slug===tool))return null;
  return <section className="tool-practice"><h3>{lang==="en"?"A simple workflow for your recording":"Ein einfacher Ablauf für deine Aufnahme"}</h3><p>{lang==="en"?"Clean up a voice recording if needed, keep the part you want, then create a smaller MP3 for sharing. Each tool is independent: download the result and choose it in the next tool. No automatic file transfer.":"Bei Bedarf Sprache bereinigen, den gewünschten Abschnitt behalten und zum Teilen eine kleinere MP3 erstellen. Die Tools arbeiten unabhängig: Ergebnis herunterladen und im nächsten Tool auswählen. Keine automatische Dateiübertragung."}</p><nav className="tool-guidance-links" aria-label={lang==="en"?"Related audio utilities":"Passende Audio-Werkzeuge"}>{utilities.filter(item=>item.slug!==tool).map(item=><Link key={item.slug} href={`${lang==="en"?"/en":""}/tools/${item.slug}`}>{item[lang]}<ArrowRight size={15}/></Link>)}</nav></section>;
}
