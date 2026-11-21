"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/types/mastering";
import MasteringLab from "@/components/mastering-lab/MasteringLab";
import StemSidechain from "./StemSidechain";
import styles from "./release-tools.module.css";

export default function KickBassWorkspace({ lang, children }: {lang:Lang; children:ReactNode}) {
  const en=lang==="en";
  const [stems,setStems]=useState(false);
  return <>
    <nav className={styles.modeNav} aria-label={en?"Choose sidechain input":"Sidechain-Quelle wählen"}>
      <Link href={en?"/en/tools":"/tools"}>{en?"All tools":"Alle Tools"}</Link>
      <button aria-pressed={!stems} onClick={()=>setStems(false)}>{en?"Stereo track":"Stereotrack"}</button>
      <button aria-pressed={stems} onClick={()=>setStems(true)}>{en?"Separate kick and bass stems":"Getrennte Kick- und Bassspuren"}</button>
    </nav>
    {stems ? <main lang={lang} className={styles.stemMain}><StemSidechain lang={lang}/>{children}</main> :
      <MasteringLab lang={lang} sidechain>{children}</MasteringLab>}
  </>;
}
