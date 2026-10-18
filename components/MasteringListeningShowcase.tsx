"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, AudioLines, Headphones, Loader2, Pause, Play, ShieldCheck, Volume2 } from "lucide-react";
import ShowcaseGallery from "./ShowcaseGallery";
import { SHOWCASE_TRACKS, showcaseTrims, showcaseWavePath, validShowcaseTrack, type ShowcaseSide, type ShowcaseTrack } from "@/lib/showcaseTracks";
import { ShowcasePlayer } from "@/lib/showcasePlayer";
import { stopGlobalAudio, subscribeGlobalAudio } from "@/lib/globalAudio";
import { startVisibleAnimation } from "@/lib/visibleAnimation";
import { createContourState, updateContourFrame } from "@/lib/showcaseContourMotion";
import { assignShowcaseCovers, COVER_STORAGE_KEY, validCoverHistory } from "@/lib/showcaseCovers";

type Lang = "de" | "en";
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function MasteringListeningShowcase({ lang = "de", initialTracks }: { lang?: Lang; initialTracks?: ShowcaseTrack[] }) {
  const en = lang === "en";
  const [tracks, setTracks] = useState(initialTracks ?? SHOWCASE_TRACKS);
  const [index, setIndex] = useState(0), [side, setSide] = useState<ShowcaseSide>("original"), [matched, setMatched] = useState(false);
  const [playing, setPlaying] = useState(false), [loading, setLoading] = useState(false), [position, setPosition] = useState(0), [error, setError] = useState(false);
  const engine = useRef<ShowcasePlayer | null>(null), canvas = useRef<HTMLCanvasElement>(null), mounted = useRef(true);
  const deck = useRef<HTMLDivElement>(null), contours = useRef<HTMLDivElement>(null);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const assignedCovers = useRef<Record<string, string>>({});
  const track = tracks[index] || tracks[0], trims = showcaseTrims(track, matched);
  const waves = useMemo(() => ({ original: showcaseWavePath(track, "original", matched), master: showcaseWavePath(track, "master", matched) }), [track, matched]);
  const number = (value: number) => value.toLocaleString(en ? "en-US" : "de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  useEffect(() => {
    const ids = tracks.map(song => song.id);
    if (ids.every(id => assignedCovers.current[id])) return;
    let previous: Record<string, string> = {};
    try { previous = validCoverHistory(JSON.parse(window.sessionStorage.getItem(COVER_STORAGE_KEY) || "{}")); } catch { /* Storage is optional; playback never depends on it. */ }
    const next = assignShowcaseCovers(ids, previous, Math.random, assignedCovers.current);
    assignedCovers.current = next; setCovers(next);
    try { window.sessionStorage.setItem(COVER_STORAGE_KEY, JSON.stringify(next)); } catch { /* Private/restricted storage still gets a random cover set. */ }
  }, [tracks]);
  function ensure() {
    if (!engine.current) {
      const player = engine.current = new ShowcasePlayer(track);
      player.onState(state => { if (mounted.current) { setPlaying(state.playing); setLoading(state.loading); setPosition(player.currentTime); } });
      player.select(side); player.setMatched(matched);
    }
    return engine.current;
  }
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeGlobalAudio(active => { if (active) engine.current?.pause(); });
    return () => { mounted.current = false; unsubscribe(); engine.current?.destroy(); engine.current = null; };
  }, []);
  useEffect(() => {
    if (initialTracks) return; // The examples page already supplies the current server-rendered publication.
    const controller = new AbortController();
    fetch("/api/showcase", { cache: "no-store", signal: controller.signal }).then(response => response.ok ? response.json() : null).then(publication => {
      // Never replace a pair while someone is listening to this page.
      if (controller.signal.aborted || engine.current || !Array.isArray(publication?.tracks) || publication.tracks.length < 1 || publication.tracks.length > 5 || !publication.tracks.every(validShowcaseTrack)) return;
      setIndex(0); setTracks(publication.tracks);
    }).catch(() => {});
    return () => controller.abort();
  }, [initialTracks]);
  const reportError = useCallback(() => { if (mounted.current) { setError(true); setPlaying(false); setLoading(false); } }, []);
  async function toggle() {
    if (playing || loading) { engine.current?.pause(); return; }
    stopGlobalAudio(); setError(false);
    try { await ensure().play(); } catch { reportError(); }
  }
  function selectTrack(next: number) {
    if (next === index) return;
    engine.current?.destroy(); engine.current = null;
    setIndex(next); setPosition(0); setPlaying(false); setLoading(false); setError(false);
  }
  function selectSide(next: ShowcaseSide) { setSide(next); engine.current?.select(next); }
  function setMatch(next: boolean) { setMatched(next); engine.current?.setMatched(next); }
  async function seek(value: number) {
    setError(false);
    try { const player = ensure(); await player.seek(value); if (mounted.current && engine.current === player) setPosition(player.currentTime); }
    catch { reportError(); }
  }
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext("2d"); if (!element || !ctx) return;
    let width = 1, height = 1, lastState = 0;
    const frequency = new Uint8Array(1024), samples = new Float32Array(2048);
    const motion = createContourState(), rings = Array.from(contours.current?.children ?? []);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resetContours = () => { contours.current?.style.setProperty("--pulse", "0"); rings.forEach(ring => (ring as HTMLElement).style.setProperty("--energy", "0")); };
    resetContours();
    const resize = () => {
      const rect = element.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height; element.width = Math.max(1, Math.round(width * ratio)); element.height = Math.max(1, Math.round(height * ratio)); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const animation = startVisibleAnimation(deck.current ?? element, now => {
      ctx.clearRect(0, 0, width, height);
      const analyser = engine.current?.analyser;
      if (playing && analyser) { analyser.getByteFrequencyData(frequency); analyser.getFloatTimeDomainData(samples); }
      else { frequency.fill(0); samples.fill(0); }
      updateContourFrame(frequency, samples, motion, now, playing && !!analyser, reducedMotion.matches);
      contours.current?.style.setProperty("--pulse", motion.pulse.toFixed(4));
      rings.forEach((ring, i) => (ring as HTMLElement).style.setProperty("--energy", motion.levels[i].toFixed(4)));
      const color = ctx.createLinearGradient(0, height, width, 0); color.addColorStop(0, "#50caff"); color.addColorStop(.5, "#ab8cff"); color.addColorStop(1, "#ed78d7"); ctx.fillStyle = color;
      for (let i = 0; i < 48; i++) { const bin = Math.min(frequency.length-1, Math.floor((i / 48) ** 2.2 * frequency.length)), size = Math.max(2, frequency[bin] / 255 * height * .92), step = width / 48; ctx.fillRect(i * step, height - size, Math.max(1, step - 3), size); }
      if (playing && now - lastState > 100) { lastState = now; setPosition(engine.current?.currentTime ?? 0); }
    }, { continuous: playing, maxFps: 40, reducedFps: 8, resize });
    return () => { animation.stop(); resetContours(); };
  }, [playing, side, index]);
  const audioLd = { "@context": "https://schema.org", "@type": "ItemList", name: en ? "Beatzucker mastering listening examples" : "Beatzucker Mastering-Hörbeispiele", itemListElement: tracks.flatMap((song, i) => (["original", "master"] as const).map((version, j) => ({ "@type": "ListItem", position: i * 2 + j + 1, item: { "@type": "AudioObject", name: `${song.title} — ${version === "original" ? (en ? "Original excerpt" : "Original-Ausschnitt") : "Beatzucker Master"}`, description: en ? "24-second listening excerpt, not the complete song." : "24-sekündige Hörprobe, nicht der vollständige Song.", contentUrl: `https://beatzucker.de${song[version].url}`, encodingFormat: "audio/mpeg", duration: "PT24S", contentSize: String(song[version].bytes) } }))) };

  return <section id="before-after" className="listening-section" aria-labelledby="listening-heading">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(audioLd).replace(/</g, "\\u003c") }} />
    <div className="listening-wrap">
      <header className="listening-heading"><span className="listening-eyebrow"><Headphones size={15} />{en ? "REAL TRACKS. YOUR EARS." : "ECHTE TRACKS. DEINE OHREN."}</span><h2 id="listening-heading">{en ? <>Hear what <em>mastering changes.</em></> : <>Hör selbst, was <em>Mastering verändert.</em></>}</h2><p>{en ? "Real songs. Original mix and Beatzucker master. Switch at the same position and decide for yourself." : "Echte Songs. Original-Mix und Beatzucker-Master. Wechsle an derselben Stelle und entscheide selbst."}</p></header>
      {!initialTracks && <p style={{textAlign:"center",margin:"-12px 0 28px",fontSize:13}}><a href={en ? "/en/mastering-examples" : "/hoervergleich"} style={{color:"#b9c9ec"}}>{en ? "Mastering before and after: listening guidance and all excerpt measurements" : "Mastering vorher und nachher: Hörhinweise und alle Ausschnitt-Messwerte"} <ArrowRight size={13} style={{display:"inline",verticalAlign:"middle"}}/></a></p>}
      <div ref={deck} className="listening-deck listening-gallery-deck" data-side={side}>
        <ShowcaseGallery tracks={tracks} index={index} side={side} playing={playing} loading={loading} en={en} onSelect={selectTrack} onToggle={()=>void toggle()} onSide={selectSide} contoursRef={contours} covers={covers}/>
        <div className="listening-main">
          <div className="listening-topline"><div><span className="listening-eyebrow">{track.genre} / A–B</span><h3>{track.title}</h3></div><span className={`listening-signal ${playing ? "is-playing" : ""}`}><i/>{loading ? (en ? "LOADING" : "LÄDT") : playing ? (en ? "PLAYING" : "SPIELT") : (en ? "24s EXCERPT" : "24s HÖRPROBE")}</span></div>
          <div className="listening-ab" role="group" aria-label={en ? "Choose original or master" : "Original oder Master wählen"}>{(["original", "master"] as const).map((version, i) => <button key={version} type="button" aria-pressed={side === version} className={side === version ? "is-active" : ""} onClick={() => selectSide(version)}><b>{i === 0 ? "A" : "B"}</b><span>{i === 0 ? (en ? "Original mix" : "Original-Mix") : "Beatzucker Master"}<small>{i === 0 ? (en ? "Before mastering" : "Vor dem Mastering") : (en ? "Supplied master" : "Bereitgestellter Master")}</small></span>{side === version && <AudioLines size={18}/>}</button>)}</div>
          <div className="listening-waves" style={{ "--position": Math.min(1, position / track.duration) } as CSSProperties} aria-label={en ? "Measured preview waveforms" : "Gemessene Wellenformen der Hörproben"}>{(["original", "master"] as const).map((version, i) => <div key={version} className={`listening-wave ${side === version ? "is-active" : ""}`}><span>{i === 0 ? "A" : "B"}</span><svg viewBox="0 0 1000 80" preserveAspectRatio="none" role="img" aria-label={version === "original" ? (en ? "Original waveform" : "Original-Wellenform") : (en ? "Master waveform" : "Master-Wellenform")}><path d={waves[version]}/></svg></div>)}<i className="listening-playhead" aria-hidden="true"/></div>
          <label className="listening-seek"><span>{en ? "Position" : "Position"}<b>{clock(position)} / {clock(track.duration)}</b></span><input type="range" min={0} max={track.duration} step={.05} value={Math.min(position,track.duration)} onChange={event => void seek(Number(event.target.value))} aria-label={en ? "Playback position" : "Wiedergabeposition"}/></label>
          <div className="listening-controls"><button type="button" className="listening-play" onClick={() => void toggle()} aria-label={loading ? (en ? "Cancel playback start" : "Wiedergabestart abbrechen") : playing ? (en ? "Pause comparison" : "Vergleich pausieren") : (en ? "Play comparison" : "Vergleich abspielen")}>{loading ? <Loader2 size={20} className="listening-spinner"/> : playing ? <Pause size={20}/> : <Play size={20}/>} {loading ? (en ? "Cancel" : "Abbrechen") : playing ? "Pause" : (en ? "Start listening" : "Vergleich starten")}</button><div className="listening-level-mode" role="group" aria-label={en ? "Loudness comparison mode" : "Lautheitsvergleich"}><button type="button" aria-pressed={matched} onClick={() => setMatch(true)}><ShieldCheck size={13}/>{en ? "Level matched" : "Lautheitsabgleich"}</button><button type="button" aria-pressed={!matched} onClick={() => setMatch(false)}><Volume2 size={13}/>{en ? "Original levels" : "Originalpegel"}</button></div></div>
          <p className="listening-fairness" role="status">{loading ? (en ? "Loading both excerpts. Playback starts when both are ready …" : "Beide Ausschnitte werden geladen. Wiedergabe startet, sobald beide bereit sind …") : matched ? (en ? `Fair comparison: trims A ${number(trims.original)} dB / B ${number(trims.master)} dB. No extra processing.` : `Fairer Vergleich: Pegel A ${number(trims.original)} dB / B ${number(trims.master)} dB. Keine zusätzliche Klangbearbeitung.`) : (en ? "Original levels: loudness differences are audible too. Louder does not automatically mean better." : "Originalpegel: Jetzt ist auch der Lautheitsunterschied hörbar. Lauter bedeutet nicht automatisch besser.")}</p>
          {error && <div className="listening-error" role="alert">{en ? "Playback unavailable. Retry or open a preview directly:" : "Wiedergabe nicht verfügbar. Erneut versuchen oder eine Hörprobe direkt öffnen:"} <a href={track.original.url}>Original</a> · <a href={track.master.url}>Master</a></div>}
          <div className="listening-readouts"><div className="listening-spectrum"><span><AudioLines size={13}/>{en ? "LIVE FREQUENCY VIEW" : "LIVE-FREQUENZBILD"}</span><canvas ref={canvas} aria-label={en ? "Frequency view of the audible signal" : "Frequenzbild des hörbaren Signals"}/><small>{playing ? (side === "original" ? "A · Original" : "B · Master") : (en ? "Responds to real playback" : "Reagiert auf echte Wiedergabe")}</small></div><div className="listening-measurements"><span>{en ? "MEASURED EXCERPT" : "GEMESSENER AUSSCHNITT"}</span><table><caption>{en ? "Preview values, before playback level matching" : "Hörprobenwerte vor Wiedergabe-Lautheitsabgleich"}</caption><thead><tr><th scope="col">{en ? "Measurement" : "Messwert"}</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>{([{key:"lufs",label:"LUFS",unit:"LUFS"},{key:"truePeak",label:"True Peak",unit:"dBTP"},{key:"crest",label:"Crest",unit:"dB"}] as const).map(metric => <tr key={metric.key}><th scope="row">{metric.label}</th><td>{number(track.original.metrics[metric.key])}<small>{metric.unit}</small></td><td>{number(track.master.metrics[metric.key])}<small>{metric.unit}</small></td></tr>)}</tbody></table></div></div>
        </div>
      </div>
      <footer className="listening-footer"><p><ShieldCheck size={15}/>{en ? "24-second aligned original/master excerpts. Both previews are MP3 320 kbps with identical short edge fades. Measurements describe these excerpts, not the full songs. No extra mastering; not a lossless comparison." : "24 Sekunden, zeitlich ausgerichteter Original-/Master-Vergleich. Beide Hörproben als MP3 320 kbps mit gleichen kurzen Randblenden. Messwerte gelten für diese Ausschnitte, nicht für ganze Songs. Kein zusätzliches Mastering; kein verlustfreier Vergleich."}</p><a href={en ? "/en#mastering" : "/#mastering"}>{en ? "Try your own track" : "Deinen Track ausprobieren"}<ArrowRight size={16}/></a></footer>
    </div>
  </section>;
}
