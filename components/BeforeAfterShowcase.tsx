"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types/mastering";
import styles from "./ListeningEntry.module.css";

const ListeningShowcase=lazy(()=>import("./MasteringListeningShowcase"));

export default function BeforeAfterShowcase({lang}:{lang:Lang}) {
  const anchor=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  const en=lang==="en";
  useEffect(()=>{
    if(open)return;
    if(!anchor.current||!("IntersectionObserver" in window)||window.location.hash==="#before-after") {setOpen(true);return;}
    const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)setOpen(true);},{rootMargin:"300px"});
    observer.observe(anchor.current);
    return ()=>observer.disconnect();
  },[open]);
  const introduction=<section className={styles.flow} aria-label={en?"Mastering examples":"Mastering-Hörbeispiele"}>
    <h2>{en?"Hear the full comparisons":"Alle Hörvergleiche anhören"}</h2>
    <p>{en?"Compare original and master on Pop and electronic tracks.":"Vergleiche Original und Master bei Pop und elektronischen Tracks."}</p>
    <Link href={en?"/en/mastering-examples":"/hoervergleich"}>{en?"Open listening examples":"Hörbeispiele öffnen"} →</Link>
  </section>;
  return <div ref={anchor} id={open?undefined:"before-after"}>{open?<Suspense fallback={introduction}><ListeningShowcase lang={lang}/></Suspense>:introduction}</div>;
}
