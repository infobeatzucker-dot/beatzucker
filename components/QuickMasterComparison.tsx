"use client";

import Link from "next/link";
import { Headphones, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ShowcasePlayer } from "@/lib/showcasePlayer";
import { SHOWCASE_TRACKS, type ShowcaseSide, type ShowcaseTrack } from "@/lib/showcaseTracks";
import { stopGlobalAudio, subscribeGlobalAudio } from "@/lib/globalAudio";
import type { Lang } from "@/lib/types/mastering";
import styles from "./ListeningEntry.module.css";

export function QuickMasterComparison({ lang, track = SHOWCASE_TRACKS[0], compact = false }: {lang: Lang;track?:ShowcaseTrack;compact?:boolean}) {
  const en = lang === "en";
  const player = useRef<ShowcasePlayer | null>(null);
  const [side, setSide] = useState<ShowcaseSide>("original");
  const [matched, setMatched] = useState(false);
  const [canMatch,setCanMatch] = useState(true);
  const [state, setState] = useState({playing:false,loading:false});
  const [error, setError] = useState(false);
  useEffect(() => {
    setCanMatch(typeof AudioContext === "function");
    // Starting another Beatzucker player also stops this preview.
    const halt = () => player.current?.pause();
    window.addEventListener("beatzucker-quick-audition", halt);
    const unsubscribe = subscribeGlobalAudio(active => { if (active) halt(); });
    return () => { unsubscribe(); window.removeEventListener("beatzucker-quick-audition",halt); player.current?.destroy(); player.current=null; };
  }, [track]);
  async function toggle() {
    if (state.playing || state.loading) { player.current?.pause(); return; }
    stopGlobalAudio();
    window.dispatchEvent(new Event("beatzucker-quick-audition"));
    setError(false);
    const audio = player.current ??= new ShowcasePlayer(track);
    audio.onState(setState);
    audio.select(side);audio.setMatched(matched);
    try { await audio.play(); }
    catch { setState({playing:false,loading:false});setError(true); }
  }
  return <section className={styles.quick} aria-label={en?"Mastering listening comparison":"Mastering-Hörvergleich"}>
    {!compact && <h2><Headphones size={17} aria-hidden="true"/>{en?"Hear what mastering changes":"Hör, was Mastering verändert"}</h2>}
    <div className={styles.row}>
      <button className={styles.primary} type="button" onClick={()=>void toggle()}>
        {state.playing ? <Pause size={15}/> : <Play size={15}/>}
        {state.loading ? (en?"Cancel":"Abbrechen") : state.playing ? "Pause" : (en?"Hear the difference":"Unterschied hören")}
      </button>
      {(["original","master"] as const).map(value=><button key={value} type="button" aria-pressed={side===value} onClick={()=>{setSide(value);player.current?.select(value);}}>
        {value==="original"?"Original":"Master"}
      </button>)}
      <button type="button" disabled={!canMatch} aria-pressed={matched} onClick={()=>{setMatched(!matched);player.current?.setMatched(!matched);}}>{en?"Level match":"Pegelabgleich"}</button>
    </div>
    {error && <p role="alert">{en?"Playback failed. Try again.":"Wiedergabe fehlgeschlagen. Bitte erneut versuchen."}</p>}
    {!canMatch && <p>{en?"Playback uses original levels in this browser.":"Dieser Browser spielt die Hörprobe mit Originalpegeln ab."}</p>}
    {!compact && <div className={styles.row}>
      <a href="#mastering">{en?"Master my track":"Eigenen Track mastern"} →</a>
      <a href="#home-express-slot">{en?"Guided mastering":"Geführt mastern"} →</a>
      <Link href={en?"/en/mastering-lab":"/mastering-lab"}>{en?"Open Mastering Lab":"Mastering Lab öffnen"} →</Link>
    </div>}
  </section>;
}
