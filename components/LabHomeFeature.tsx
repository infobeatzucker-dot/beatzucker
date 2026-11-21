import Link from "next/link";
import { ArrowRight, AudioWaveform, CircleGauge, SlidersHorizontal } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import styles from "./LabHomeFeature.module.css";

// Peak envelope from the public Xplore Belgium demo excerpt.
const envelope = [70,43,41,37,35,39,63,35,93,51,71,66,70,62,77,71,71,64,69,72,68,78,68,67,64,77,68,68,68,76,68,71,71,70,68,75,68,76,72,79,75,70,65,68,73,75,70,68,75,68,76,70,68,68,65,69,73,68,70,72,63,71,72,74,69,67,72,70,75,70,72,69,65,59,47,72,66,60,56,43,49,50,45,35,33,32,37,38];

export default function LabHomeFeature({ lang }: { lang: Lang }) {
  const en = lang === "en";
  return <section className={styles.feature} id="discover-lab" aria-labelledby="home-lab-title">
    <div className={styles.copy}>
      <h2 id="home-lab-title">Mastering Lab</h2>
      <p>{en ? "Shape your master by hand. Dial in EQ, dynamics and stereo, compare your edits live, and see how much headroom is left." : "Forme deinen Master von Hand. Stell EQ, Dynamik und Stereo ein, vergleiche live und sieh, wie viel Pegelreserve noch da ist."}</p>
      <Link className={styles.open} href={en ? "/en/mastering-lab" : "/mastering-lab"}>{en ? "Open Mastering Lab" : "Mastering Lab öffnen"} <ArrowRight size={17} aria-hidden="true" /></Link>
      <small>{en ? "Try your own track for free. Downloads require activation." : "Mit eigenem Track kostenlos ausprobieren. Download nach Freischaltung."}</small>
    </div>
    <div className={styles.console} aria-hidden="true">
      <div className={styles.consoleTop}><AudioWaveform size={19}/><span>Xplore Belgium</span><span>Original</span></div>
      <div className={styles.wave}>{envelope.map((height, i) => <i key={i} style={{height: height + "%"}}/>)}</div>
      <div className={styles.modules}>
        <span><SlidersHorizontal size={16}/> EQ</span><span><i/> {en ? "Dynamics" : "Dynamik"}</span>
        <span><i/> Stereo</span><span><CircleGauge size={16}/> Limiter</span>
      </div>
    </div>
  </section>;
}
