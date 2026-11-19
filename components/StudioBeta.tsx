"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Activity, ArrowLeft, ArrowRight, AudioLines, Check, Download, Folder, Layers, MicOff, Pause, Play, Scissors, Settings, SlidersHorizontal, UploadCloud } from "lucide-react";
import MasteringWorkspace from "@/components/MasteringWorkspace";
import ThemeSelector from "@/components/ThemeSelector";
import { StudioDial, StudioMeter } from "@/components/StudioControls";
import StudioSignalScope from "@/components/StudioSignalScope";
import ScrollToTop from "@/components/ScrollToTop";
import StudioFineTuneButton from "@/components/StudioFineTuneButton";
import { platformLoudness } from "@/components/PlatformTargets";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { stopGlobalAudio } from "@/lib/globalAudio";
import { startVisibleAnimation } from "@/lib/visibleAnimation";
import type { AnalysisData, AppState, Lang, Platform } from "@/lib/types/mastering";
import "./studio-beta.css";

const steps = [
  { icon: UploadCloud, de: "Upload", en: "Upload" },
  { icon: Activity, de: "Analyse", en: "Analyze" },
  { icon: SlidersHorizontal, de: "Mastering", en: "Master" },
  { icon: Download, de: "Ergebnis", en: "Result" },
] as const;

const currentStep: Record<AppState, number> = {
  idle: 0, uploaded: 1, analyzing: 1, analyzed: 2, mastering: 2, done: 3,
};

function StereoBridge() {
  const engine = useAudioEngine();
  const left = engine?.analyserL, right = engine?.analyserR, playing = engine?.isPlaying;
  const bridge = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = bridge.current;
    if (!element || !left || !right || !playing) return;
    const buffer = new Float32Array(Math.max(left.fftSize, right.fftSize));
    const update = startVisibleAnimation(element, () => {
      [left, right].forEach((analyser, channel) => {
        analyser.getFloatTimeDomainData(buffer);
        let peak = 0;
        for (let i = 0; i < analyser.fftSize; i++) peak = Math.max(peak, Math.abs(buffer[i]));
        const scale = Math.max(0, (20 * Math.log10(peak) + 54) / 54);
        element.style.setProperty(channel === 0 ? "--level-l" : "--level-r", String(Math.min(scale, 1)));
      });
    }, { maxFps: 25 });
    return () => {
      update.stop();
      element.style.removeProperty("--level-l");
      element.style.removeProperty("--level-r");
    };
  }, [left, right, playing]);
  return <div ref={bridge} className="beta-stereo" aria-hidden="true"><div><i/><small>L</small></div><div><i/><small>R</small></div></div>;
}

function Workflow({ state, before, after, lang }: { state: AppState; before: AnalysisData | null; after: AnalysisData | null; lang: Lang }) {
  const active = currentStep[state];
  const measured = after ?? before;
  const en = lang === "en";
  return <div className="beta-workflow">
    <ol aria-label={en ? "Mastering workflow" : "Mastering-Ablauf"}>
      {steps.map(({ icon: Icon, ...label }, index) => <li key={label.en}
        aria-current={index === active ? "step" : undefined} data-complete={index < active}>
        <span className="beta-step-icon">{index < active ? <Check size={17} /> : <Icon size={17} />}</span>
        <span>{label[lang]}</span>
      </li>)}
    </ol>
    <section className="beta-meter-panel bz-hardware" aria-label={en ? "Measured levels" : "Gemessene Pegel"}>
      <div className="beta-meter-heading"><AudioLines size={15} aria-hidden="true" /><strong>{en ? "Meter bridge" : "Pegelanzeige"}</strong>
        <span>{after ? "Master" : before ? "Original" : en ? "Awaiting audio" : "Warte auf Audio"}</span>
      </div>
      <div className="beta-meter-display"><div className="beta-meter-values">
        <StudioMeter label="LUFS" reading={measured ? measured.integrated_lufs.toFixed(1) : "—"} fraction={measured ? (measured.integrated_lufs + 36) / 36 : 0} active={!!measured} />
        <StudioMeter label="True Peak" reading={measured ? `${measured.true_peak.toFixed(1)} dBTP` : "—"} fraction={measured ? (measured.true_peak + 24) / 24 : 0} active={!!measured} />
        <StudioMeter label="LRA" reading={measured ? `${measured.lra.toFixed(1)} LU` : "—"} fraction={measured ? measured.lra / 20 : 0} active={!!measured} />
      </div><StereoBridge /></div>
    </section>
  </div>;
}

const demoSource = "/audio/showcase/xplore-belgium-original-dae291b6f6fc.mp3";
// Peak envelope of the published demo clip, normalized against digital full scale.
const demoWave = [43,22,13,12,13,15,32,33,14,41,26,50,45,46,44,52,44,44,45,40,47,48,36,46,44,42,42,44,44,46,48,47,46,46,47,47,48,48,42,44,47,50,52,53,47,45,41,46,51,47,53,44,47,44,51,48,44,46,44,43,47,46,52,43,47,38,44,42,48,50,45,46,51,49,47,45,49,43,48,34,39,47,40,40,32,32,24,33,27,26,27,23,21,21,21,20].map(peak => peak / 100);

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function Transport({ filename, lang }: { filename?: string; lang: Lang }) {
  const en = lang === "en";
  const engine = useAudioEngine();
  const audio = useRef<HTMLAudioElement>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoTime, setDemoTime] = useState(0);
  const [demoDuration, setDemoDuration] = useState(0);
  const [demoError, setDemoError] = useState(false);
  const [scopeView, setScopeView] = useState<"wave" | "spectrum">("wave");
  const demoContext = useRef<AudioContext | null>(null);
  const [demoAnalyser, setDemoAnalyser] = useState<AnalyserNode | null>(null);
  const demo = !filename;
  useEffect(() => {
    const element = audio.current;
    return () => {
      element?.pause();
      void demoContext.current?.close().catch(() => {});
    };
  }, []);
  const time = demo ? demoTime : engine?.currentTime ?? 0;
  const duration = demo ? demoDuration : engine?.duration ?? 0;
  const playing = demo ? demoPlaying : !!engine?.isPlaying;
  const waveform = demo ? demoWave : (engine?.mode === "B" ? engine.peakWaveformB : engine?.peakWaveform) ?? engine?.peakWaveform;
  const masterAvailable = !!engine?.masteredUrl && !engine.masterUnavailable;
  function togglePlayback() {
    if (!demo) { engine?.togglePlay(); return; }
    const element = audio.current;
    if (!element) return;
    if (!element.paused) { element.pause(); return; }
    stopGlobalAudio();
    setDemoError(false);
    if (!demoContext.current && typeof AudioContext !== "undefined") {
      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = .72;
        context.createMediaElementSource(element).connect(analyser);
        analyser.connect(context.destination);
        demoContext.current = context;
        setDemoAnalyser(analyser);
      } catch { /* Playback can still use the media element if Web Audio is unavailable. */ }
    }
    void demoContext.current?.resume().catch(() => {});
    void element.play().catch(() => setDemoError(true));
  }
  return <section className="beta-deck" aria-label={en ? "Track player" : "Track-Player"}>
    {demo && <audio ref={audio} src={demoSource} preload="none"
      onPlay={() => setDemoPlaying(true)} onPause={() => setDemoPlaying(false)} onEnded={() => setDemoPlaying(false)}
      onTimeUpdate={event => setDemoTime(event.currentTarget.currentTime)}
      onLoadedMetadata={event => { if (Number.isFinite(event.currentTarget.duration)) setDemoDuration(event.currentTarget.duration); }}
      onError={() => setDemoError(true)} />}
    <div className="beta-deck-head">
      <button className="beta-play-key" type="button" aria-label={playing ? "Pause" : (en ? "Play" : "Abspielen")}
        onClick={togglePlayback} disabled={!demo && !engine?.originalUrl}>{playing ? <Pause size={20}/> : <Play size={20}/>}</button>
      <div><small>{demo ? (en ? "Demo track" : "Demo-Track") : (en ? "Track loaded" : "Track geladen")}</small>
        <strong>{filename ?? "Xplore Belgium"}</strong></div>
      <output>{clock(time)} / {duration ? clock(duration) : "—"}</output>
    </div>
    <div className="beta-wave-display" data-view={scopeView}>
      {scopeView === "wave" && <div className="beta-wave-bars" aria-hidden="true">
        {waveform ? Array.from({ length: 96 }, (_, index) =>
          <i key={index} style={{
            "--amplitude": Math.min(100, (waveform[Math.floor(index * waveform.length / 96)] || 0) * 165) + "%",
            "--color-position": index / 95 * 100 + "%",
          } as CSSProperties}/>,
        ) : null}
      </div>}
      <StudioSignalScope view={scopeView} playing={playing}
        mono={demo ? demoAnalyser : engine?.analyserMono ?? null}
        left={demo ? null : engine?.analyserL} right={demo ? null : engine?.analyserR}
      />
      {scopeView === "spectrum" && !playing && <small className="beta-scope-idle">{en ? "Live spectrum during playback" : "Live-Spektrum während der Wiedergabe"}</small>}
      {duration > 0 && scopeView === "wave" && <>
        <span className="beta-wave-cursor" aria-hidden="true" style={{ left: `${Math.min(100, time / duration * 100)}%` }} />
        <input type="range" aria-label={en ? "Playback position" : "Wiedergabeposition"} min={0} max={duration} step={0.01} value={Math.min(time, duration)}
          onChange={event => { const position = Number(event.target.value); if (demo && audio.current) { audio.current.currentTime = position; setDemoTime(position); } else engine?.seek(position); }} />
      </>}
    </div>
    <div className="beta-deck-foot">
      {demo ? <span>{demoError ? (en ? "Playback unavailable" : "Wiedergabe nicht verfügbar") : (en ? "Play the demo or load your own track." : "Spiele die Demo ab oder lade deinen eigenen Track.")}</span>
        : <div className="beta-ab-keys" role="group" aria-label={en ? "A/B comparison" : "A/B-Vergleich"}>
          <button type="button" aria-pressed={engine?.mode === "A"} onClick={() => engine?.setMode("A")}>A <span>Original</span></button>
          <button type="button" disabled={!masterAvailable} aria-pressed={engine?.mode === "B"} onClick={() => engine?.setMode("B")}>B <span>Master</span></button>
          {masterAvailable && <label><input type="checkbox" checked={engine?.loudnessMatched ?? false} onChange={event => engine?.setLoudnessMatched(event.target.checked)}/> {en ? "Match loudness" : "Lautheitsabgleich"}</label>}
        </div>}
      <div className="beta-scope-switch" role="group" aria-label={en ? "Monitor display" : "Monitoranzeige"}>
        <button type="button" aria-pressed={scopeView === "wave"} onClick={() => setScopeView("wave")}>{en ? "Waveform" : "Wellenform"}</button>
        <button type="button" aria-pressed={scopeView === "spectrum"} onClick={() => setScopeView("spectrum")}>{en ? "Spectrum" : "Spektrum"}</button>
      </div>
    </div>
  </section>;
}

function Controls({ intensity, onIntensity, character, onCharacter, customLufs, platform, onLufs, lang }: {
  intensity: number; onIntensity: (value: number) => void; character: number; onCharacter: (value: number) => void;
  customLufs: number; platform: Platform; onLufs: (value: number) => void; lang: Lang;
}) {
  const en = lang === "en";
  const target = platformLoudness(platform, customLufs);
  return <section className="beta-processor bz-hardware">
    <h3><SlidersHorizontal size={17} aria-hidden="true" />{en ? "Mastering processor" : "Mastering-Prozessor"}</h3>
    <div className="beta-processor-controls">
      <StudioDial label={en ? "Target loudness" : "Lautheitsziel"} reading={`${target.toFixed(1)} LUFS`} value={target} min={-23} max={-6} step={0.5} change={onLufs} />
      <StudioDial label={en ? "Intensity" : "Intensität"} reading={`${intensity} %`} value={intensity} min={0} max={100} step={1} change={onIntensity} />
      <StudioDial label={en ? "Character" : "Klangcharakter"} reading={`${Math.round(character * 100)} %`} value={Math.round(character * 100)} min={0} max={100} step={1} change={value => onCharacter(value / 100)} />
    </div>
    <p>{en ? "Adjusting target loudness selects the custom platform setting." : "Wenn du das Lautheitsziel drehst, wechselt das Plattform-Ziel auf „Eigene“."}</p>
  </section>;
}

function Actions({ lang, state, canStart, format, formats, onFormat, onStart, onManual, onRemaster }: {
  lang: Lang; state: AppState; canStart: boolean; format: string;
  formats: readonly { key: string; label: string }[]; onFormat: (value: string) => void;
  onStart: () => void; onManual: () => void; onRemaster: () => void;
}) {
  const en = lang === "en";
  return <div className="beta-output">
    <label>{en ? "Export format" : "Exportformat"}<select value={format} onChange={event => onFormat(event.target.value)}>
      {formats.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
    </select></label>
    {state === "done" ? <>
      <button type="button" onClick={onRemaster}>{en ? "Remaster" : "Erneut mastern"}</button>
      <StudioFineTuneButton onClick={onManual} label={en ? "Fine-tune" : "Feinabstimmung"} />
      <a className="beta-render-key" href="#beta-exports"><Download size={17}/>Downloads</a>
    </> : <button type="button" className="beta-render-key" disabled={!canStart} onClick={onStart}>
      <AudioLines size={19}/>{state === "mastering" ? (en ? "Mastering…" : "Mastering läuft…") : (en ? "Master track" : "Track mastern")}
    </button>}
  </div>;
}

const studio = { Workflow, Transport, Controls, Actions };

const tools = [
  { slug: "vocal-remover", icon: MicOff, de: "Vocals und Instrumental trennen", en: "Separate vocals and instrumental", name: { de: "Vocal Remover", en: "Vocal Remover" } },
  { slug: "stem-separation", icon: Layers, de: "Einzelspuren im Mixer anhören", en: "Hear isolated tracks in the mixer", name: { de: "Stem Separation", en: "Stem Separation" } },
  { slug: "audio-cutter", icon: Scissors, de: "Einen Ausschnitt schneiden und exportieren", en: "Trim and export a section of audio", name: { de: "Audio schneiden", en: "Audio Cutter" } },
] as const;

export default function StudioBeta({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const locale = en ? "/en" : "";
  return <main className="bz-beta" lang={lang}>
    <div className="beta-frame">
      <header className="beta-header">
        <a className="beta-wordmark" href={locale || "/"}><AudioLines aria-hidden="true" />Beatzucker</a>
        <nav aria-label={en ? "Studio navigation" : "Studio-Navigation"}>
          <a href="#beta-mastering" aria-current="page"><AudioLines aria-hidden="true" />Mastering</a>
          <a href={`/dashboard/library?lang=${lang}`}><Folder aria-hidden="true" />{en ? "Library" : "Bibliothek"}</a>
          <a href={`/dashboard/profile?lang=${lang}`}><Settings aria-hidden="true" />{en ? "Settings" : "Einstellungen"}</a>
        </nav>
        <div className="beta-preferences">
          <ThemeSelector lang={lang} />
          <a className="beta-language" href={en ? "/studio-beta" : "/en/studio-beta"} lang={en ? "de" : "en"}
            hrefLang={en ? "de" : "en"} aria-label={en ? "Deutsch" : "English"}>{en ? "DE" : "EN"}</a>
        </div>
      </header>
      <section className="beta-intro" aria-labelledby="beta-title">
        <div>
          <span className="beta-edition"><i />Studio Mode</span>
          <h1 id="beta-title">{en ? "Shape your " : "Forme deinen "}<em>Sound.</em></h1>
          <p>{en ? "Upload, master and fine-tune your track in the new studio console." : "Lade deinen Track hoch, mastere ihn und nimm die Feinabstimmung an der neuen Studiokonsole vor."}</p>
        </div>
        <div className="beta-intro-actions">
          <a className="beta-back" href={locale || "/"}><ArrowLeft size={16} aria-hidden="true" />{en ? "Classic interface" : "Klassische Oberfläche"}</a>
          <div id="beta-express-slot" />
        </div>
      </section>
      <section id="beta-mastering" aria-label={en ? "Mastering console" : "Mastering-Konsole"}>
        <nav className="beta-module-nav" aria-label={en ? "Console modules" : "Konsolenmodule"}>
          <a href="#beta-monitor"><AudioLines size={15} aria-hidden="true" />Monitor</a>
          <a href="#beta-processor"><SlidersHorizontal size={15} aria-hidden="true" />{en ? "Processor" : "Prozessor"}</a>
          <a href="#beta-references"><Layers size={15} aria-hidden="true" />{en ? "References" : "Referenzen"}</a>
          <a href="#beta-manual"><Activity size={15} aria-hidden="true" />{en ? "Fine-tuning" : "Feinabstimmung"}</a>
          <a href="#beta-exports"><Download size={15} aria-hidden="true" />Export</a>
        </nav>
        <MasteringWorkspace lang={lang} studio={studio} />
      </section>
      <section className="beta-tools" aria-labelledby="beta-tools-heading">
        <h2 id="beta-tools-heading">{en ? "Audio tools" : "Audio-Tools"}</h2>
        <div>{tools.map(({ slug, icon: Icon, name, ...description }) => <a key={slug} href={`${locale}/tools/${slug}`}>
          <Icon aria-hidden="true" /><span><strong>{name[lang]}</strong><small>{description[lang]}</small></span><ArrowRight aria-hidden="true" />
        </a>)}</div>
      </section>
    </div>
    <ScrollToTop lang={lang} />
  </main>;
}
