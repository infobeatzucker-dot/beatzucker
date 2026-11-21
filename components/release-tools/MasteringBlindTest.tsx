"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAudio } from "@/lib/clientAudio";
import { toolError } from "@/lib/toolClient";
import { useToolJob } from "@/lib/useToolJob";
import type { Lang } from "@/lib/types/mastering";
import { inspect } from "@/components/mastering-lab/settings";
import { receiveReleaseFile } from "@/lib/releaseHandoff";
import { ToolPanel, ToolError } from "./ToolPanel";
import { useAudioTransport } from "./useAudioTransport";
import styles from "./release-tools.module.css";

type Source = { file: File; buffer: AudioBuffer; lufs: number; peak: number };
type Pair = [Source, Source];
const chooseOrder = (): 0 | 1 => (crypto.getRandomValues(new Uint8Array(1))[0] & 1) as 0 | 1;

export default function MasteringBlindTest({ lang }: { lang: Lang }) {
  const t = (de: string, en: string) => lang === "en" ? en : de;
  const job = useToolJob();
  const [files, setFiles] = useState<[File?,File?]>([]);
  const [pair, setPair] = useState<Pair>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState<number>();
  const [active, setActive] = useState(0);
  const [order, setOrder] = useState<0 | 1>(0);
  useEffect(()=>{const file=receiveReleaseFile("mastering-blindtest");if(file)setFiles([undefined,file]);},[]);
  const duration = pair ? Math.min(pair[0].buffer.duration, pair[1].buffer.duration) : 0;
  const tracks = useMemo(() => {
    if (!pair) return [];
    const target = Math.min(...pair.flatMap(item => [item.lufs, item.lufs - 1 - item.peak]));
    return [pair[order], pair[1 - order]].map(item => ({ buffer: item.buffer, gain: 10 ** ((target - item.lufs) / 20) }));
  }, [pair, order]);
  const player = useAudioTransport(tracks, duration);

  async function prepare() {
    if (!files[0] || !files[1]) return;
    const selected = [files[0], files[1]];
    const task = job.start();
    setBusy(true); setError(""); setPair(undefined); setChoice(undefined);
    try {
      const sources: Source[] = [];
      for (const file of selected) {
        if (file.size > 40 * 1024 * 1024) throw Error("SIZE");
        const buffer = await decodeAudio(file);
        if (!job.active(task)) return;
        if (buffer.duration < .1 || buffer.duration > 600) throw Error("DURATION");
        const stats = inspect(buffer, false);
        if (stats.lufs == null) throw Error("NO_SIGNAL");
        sources.push({ file, buffer, lufs: stats.lufs, peak: stats.estimatedTruePeak });
      }
      setOrder(chooseOrder()); setActive(0); setPair(sources as Pair);
    } catch (reason) { if (job.active(task)) setError(toolError(reason, lang)); }
    finally { if (job.active(task)) setBusy(false); }
  }
  function reset() {
    player.stop(true); setPair(undefined); setChoice(undefined); setFiles([]);
  }
  return <ToolPanel>
    {!pair ? <>
      <div className={styles.grid}>{([0,1] as const).map(i => <label key={i}>{t("Master", "Master")} {i + 1}
        {files[i] && <small>{files[i]?.name}</small>}
        <input type="file" accept="audio/*,.wav,.aiff,.m4a,.flac,.mp3" disabled={busy} onChange={event => {
          const file = event.currentTarget.files?.[0];
          setFiles(previous => { const next: [File?,File?] = [...previous]; next[i] = file; return next; });
        }} />
      </label>)}</div>
      <p className={styles.hint}>{t("Für einen fairen Vergleich zwei Exporte mit demselben Startpunkt verwenden. Bis 40 MB pro Datei, lokal im Browser.", "Use two exports with the same starting point for a fair comparison. Up to 40 MB per file, locally in your browser.")}</p>
      <button data-action disabled={!files[0] || !files[1] || busy} onClick={() => void prepare()}>{busy ? t("Lautheit wird gemessen …", "Measuring loudness…") : t("Blindtest starten", "Start blind test")}</button>
    </> : <>
      <p>{t("A und B spielen an derselben Position. Der Lautheitsabgleich ist für beide aktiv.", "A and B play at the same position. Loudness matching is on for both.")}</p>
      <div className={styles.row}>
        <button data-action onClick={() => player.playing ? player.stop() : void player.play().catch(reason => setError(toolError(reason, lang)))}>{player.playing ? t("Pause", "Pause") : t("Abspielen", "Play")}</button>
        {[0,1].map(index => <button key={index} aria-pressed={active === index} onClick={() => { setActive(index); player.select(index); }}>{index ? "B" : "A"}</button>)}
        <button onClick={reset}>{t("Andere Dateien", "Change files")}</button>
      </div>
      <label>{t("Position", "Position")} · {player.position.toFixed(1)} s <input type="range" min={0} max={Math.max(0,duration - .01)} step=".01" value={Math.min(player.position, duration - .01)} onChange={event => void player.seek(+event.target.value).catch(reason => setError(toolError(reason, lang)))}/></label>
      {choice === undefined ? <div className={styles.row}>
        <button onClick={() => setChoice(0)}>{t("A gefällt mir besser", "I prefer A")}</button>
        <button onClick={() => setChoice(1)}>{t("B gefällt mir besser", "I prefer B")}</button>
        <button onClick={() => setChoice(2)}>{t("Kein Favorit", "No preference")}</button>
      </div> : <div role="status">
        <p>{t("Auflösung", "Reveal")} · A: {pair[order].file.name} · B: {pair[1-order].file.name}</p>
        <p>{choice > 1 ? t("Kein Favorit gewählt.", "No preference selected.") : t("Deine Wahl: ", "Your choice: ") + pair[choice ? 1 - order : order].file.name}</p>
        <button onClick={() => { player.stop(true); player.select(0); setOrder(chooseOrder()); setChoice(undefined); setActive(0); }}>{t("Neue Blindrunde", "New blind round")}</button>
      </div>}
    </>}
    <ToolError>{error}</ToolError>
  </ToolPanel>;
}
