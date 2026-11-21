"use client";

import Link from "next/link";
import { useState, useId } from "react";
import type { Lang } from "@/lib/types/mastering";
import styles from "./ListeningEntry.module.css";

const routes = [
 { slug:"mix-check", de:["Mein Mix klingt dumpf","Miss zuerst die Klangbalance und höre eine Stelle mit Stimme und Becken. Prüfe dann im Lab eine kleine Höhenkorrektur im A/B.", "Zum Mix-Check"], en:["My mix sounds dull","Check the tonal balance and listen to a section with vocals and cymbals. Then audition a small high-end adjustment in the Lab.","Open Mix Check"], article:"mastering-lab-pegel-kick-bass" },
 { slug:"tools/kick-bass-sidechain", de:["Kick und Bass stören sich","Loope eine Stelle mit Kick und Bass. Starte mit 1–2 dB Absenkung. Mit Einzelspuren kann nur der Bass bearbeitet werden.","Kick & Bass öffnen"], en:["Kick and bass clash","Loop a passage with kick and bass. Start with 1–2 dB of ducking. Separate stems let you process the bass alone.","Open Kick & Bass"], article:"mastering-lab-pegel-kick-bass" },
 { slug:"mastering-lab",de:["Ich möchte selbst mastern","Wähle ein Preset als Startpunkt. Vergleiche kleine EQ- und Dynamikänderungen bei angeglichener Lautheit.","Mastering Lab öffnen"],en:["I want to master by hand","Choose a preset as a starting point. Compare subtle EQ and dynamics changes at matched loudness.","Open Mastering Lab"],article:"mastering-lab-pegel-kick-bass" },
 { slug:"tools/release-check",de:["Mein Release ist fertig","Miss Lautheit und True Peak an der tatsächlich exportierten Datei und prüfe sie gegen dein Ziel.","Release-Check öffnen"],en:["My release is ready","Measure loudness and true peak on the exported file and check them against your target.","Open Release Check"],article:"master-vergleichen-und-veroeffentlichen" },
] as const;

export default function TrackRouteFinder({lang, compact=false}:{lang:Lang;compact?:boolean}) {
 const en=lang==="en", id=useId();
 const [selected,setSelected]=useState(0);
 const route=routes[selected], text=route[lang], root=en?"/en":"";
 return <section className={styles.flow} id={compact?undefined:"track-route"} aria-labelledby={id}>
   <h2 id={id}>{en?"What does your track need?":"Welcher Weg passt zu deinem Track?"}</h2>
   <label><span className="sr-only">{en?"Choose a goal":"Ziel wählen"}</span><select aria-label={en?"Choose a goal":"Ziel wählen"} value={selected} onChange={event=>setSelected(Number(event.target.value))}>
     {routes.map((item,index)=><option key={item.slug} value={index}>{item[lang][0]}</option>)}
   </select></label>
   <p>{text[1]}</p>
   <div className={styles.row}><Link href={root+"/"+route.slug}>{text[2]} →</Link>
   <Link href={(en?"/en/knowledge/":"/ressourcen/")+route.article}>{en?"Read a practical example":"Praxisbeispiel lesen"} →</Link></div>
 </section>;
}
