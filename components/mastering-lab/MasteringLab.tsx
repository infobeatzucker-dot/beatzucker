"use client";

import Link from "next/link";
import { Activity, AudioLines, ArrowUpLeft, AudioWaveform, ChevronLeft, ChevronRight, CircleGauge, Headphones, Info, LocateFixed, Pause, Play, Power, Repeat, RotateCcw, SlidersHorizontal, TriangleAlert, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { UI_THEMES, getUiTheme, isUiTheme, type UiThemeId } from "@/lib/uiTheme";
import { LabAudio } from "./audio";
import { LabScope, spectrumPosition, spectrumTicks } from "./LabScope";
import { LabDelivery } from "./LabDelivery";
import { decodeAudioBytes, inspectAudioMetadata } from "@/lib/clientAudio";
import { LabHelp } from "./LabHelp";
import AccountLabPresets from "@/components/AccountLabPresets";
import { genreStart, inspect, loudestPassage, neutral, presets, presetSettings, ranges, resetModule, toDb, type Module, type Settings } from "./settings";
import { useComparison } from "./useComparison";
import { settingsWarnings } from "./warnings";
import { genreModulePresets, modulePresets } from "./modulePresets";
import { WaveformDisplay } from "./WaveformDisplay";
import { snapshotKey, storedSnapshots, type Snapshots } from "./snapshots";
import styles from "./lab.module.css";

const preference = "beatzucker_mastering_lab_theme";
const controlPreference = "beatzucker_mastering_lab_controls";
type ControlMode = "knob" | "fader";
const demo = "/audio/showcase/xplore-belgium-original-dae291b6f6fc.mp3";
const modules = [
  { id: "input", icon: SlidersHorizontal, title: ["Eingang", "Input"], detail: ["Pegel vor dem EQ", "Level before EQ"] },
  { id: "eq", icon: AudioWaveform, title: ["Equalizer", "Equalizer"], detail: ["4 Bänder", "4 bands"] },
  { id: "ducking", icon: Activity, title: ["Kick & Bass", "Kick & bass"], detail: ["Bass-Ducking bei Kick-Schlägen", "Kick-triggered bass ducking"] },
  { id: "deesser", icon: AudioLines, title: ["De-Esser", "De-esser"], detail: ["Zischlaute und Spitzen", "Sibilance and harsh peaks"] },
  { id: "dynamics", icon: Activity, title: ["Multiband-Dynamik", "Multiband dynamics"], detail: ["4 Frequenzbereiche", "4 frequency ranges"] },
  { id: "stereo", icon: Headphones, title: ["Stereo", "Stereo"], detail: ["Breite & Bass-Mono", "Width & mono bass"] },
  { id: "saturation", icon: AudioLines, title: ["Sättigung", "Saturation"], detail: ["Weiche Spitzen", "Soft peak shaping"] },
  { id: "finalEq", icon: AudioWaveform, title: ["Final EQ", "Final EQ"], detail: ["Höhen nach der Sättigung", "Highs after saturation"] },
  { id: "bus", icon: Activity, title: ["Bus-Kompressor", "Bus compressor"], detail: ["Dynamik der Summe", "Full-band dynamics"] },
  { id: "limiter", icon: CircleGauge, title: ["Limiter", "Limiter"], detail: ["Pegelspitzen", "Sample peaks"] },
] as const;

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

const thresholdHelp = ["Ab diesem Pegel setzt die Kompression ein. Eine niedrigere Schwelle greift früher ein.", "Compression starts above this level. A lower threshold makes it engage sooner."] as const;
const ratioHelp = ["Bestimmt, wie stark Pegel oberhalb der Schwelle reduziert werden. 1:1 lässt sie unverändert.", "Sets how strongly levels above the threshold are reduced. At 1:1 they are unchanged."] as const;
const controls = {
  trim: { label: ["Eingangspegel", "Input gain"], help: ["Pegel vor der gesamten Kette. Absenken schafft Reserven für EQ und Dynamik.", "Level feeding the entire chain. Reduce it to leave headroom for EQ and dynamics."], min: -18, max: 12, step: .1, unit: "dB" },
  deessFrequency: { label: ["Einsatzfrequenz", "Frequency"], help: ["Legt fest, ab welchem Höhenbereich der De-Esser vor allem arbeitet.", "Sets the region where the de-esser mainly works."], min: 2500, max: 11000, step: 100, unit: "Hz" },
  deessThreshold: { label: ["Schwelle", "Threshold"], help: ["Je niedriger die Schwelle, desto früher greift der De-Esser bei Spitzen in den Höhen ein.", "A lower threshold makes the de-esser act sooner on high-frequency peaks."], min: -45, max: -8, step: .5, unit: "dB" },
  deessAmount: { label: ["Stärke", "Amount"], help: ["Regelt, wie stark auffällige Höhen bei Überschreiten der Schwelle abgesenkt werden.", "Sets how strongly prominent highs are reduced when they cross the threshold."], min: 0, max: 100, step: 1, unit: "%" },
  duckDepth: { label: ["Absenkung", "Duck depth"], help: ["Maximale Absenkung im Subbass pro erkanntem Schlag. Starte mit 1–2 dB.", "Maximum sub-bass ducking per detected hit. Start with 1–2 dB."], min: 0, max: 8, step: .1, unit: "dB" },
  duckFrequency: { label: ["Tiefbass-Grenze", "Bass cutoff"], help: ["Bestimmt, welcher Tiefbass abgesenkt wird. Höhere Werte greifen weiter in die Bässe ein.", "Sets the low band to duck. Higher values affect more of the bass range."], min: 45, max: 150, step: 1, unit: "Hz" },
  duckThreshold: { label: ["Kick-Schwelle", "Kick threshold"], help: ["Eine tiefere Schwelle reagiert auf leisere Schläge. Bei Auslösungen durch den Bass die Schwelle anheben.", "A lower threshold picks up quieter hits. Raise it if the bass triggers ducking."], min: -50, max: -12, step: 1, unit: "dBFS" },
  duckRelease: { label: ["Rückkehr", "Recovery"], help: ["Bestimmt, wie schnell der Tiefbass nach dem Schlag zurückkehrt.", "Sets how quickly the low end returns after a hit."], min: 50, max: 380, step: 1, unit: "ms" },
  width: { label: ["Stereobreite", "Stereo width"], help: ["Regelt das Seitensignal. 100 % erhält die Breite, 0 % ergibt Mono.", "Scales the side signal. 100% preserves width, while 0% makes the signal mono."], min: 0, max: 175, step: 1, unit: "%" },
  monoBass: { label: ["Bass-Mono", "Mono bass"], help: ["Bündelt tiefe Seitenanteile um und unter 120 Hz. Höhere Frequenzen behalten ihre Breite.", "Narrows low-frequency side information around and below 120 Hz while retaining width farther up."], min: 0, max: 100, step: 1, unit: "%" },
  saturation: { label: ["Anteil", "Amount"], help: ["Mischt weich abgerundete Pegelspitzen hinzu. Höhere Werte verändern Klang und Dynamik stärker.", "Blends in a soft peak-shaping curve. Higher values change tone and dynamics more strongly."], min: 0, max: 100, step: 1, unit: "%" },
  finalAir: { label: ["Höhenkorrektur", "Air gain"], help: ["Hebt die Höhen nach der Sättigung breit an oder senkt sie ab.", "Broadly boosts or cuts high frequencies after saturation."], min: -6, max: 6, step: .1, unit: "dB" },
  finalFrequency: { label: ["Einsatzfrequenz", "Frequency"], help: ["Verschiebt den Frequenzbereich der letzten Höhenkorrektur.", "Moves the frequency region affected by the last high-frequency adjustment."], min: 5000, max: 16000, step: 100, unit: "Hz" },
  busThreshold: { label: ["Schwelle", "Threshold"], help: thresholdHelp, min: -48, max: 0, step: .1, unit: "dB" },
  busRatio: { label: ["Ratio", "Ratio"], help: ratioHelp, min: 1, max: 4, step: .1, unit: ":1" },
  drive: { label: ["Eingangsverstärkung", "Input drive"], help: ["Verstärkt das Signal vor der Begrenzung. Mehr Drive bedeutet in der Regel mehr Pegelreduktion.", "Boosts the signal before limiting. More drive usually increases gain reduction."], min: 0, max: 12, step: .1, unit: "dB" },
  ceiling: { label: ["Obergrenze", "Ceiling"], help: ["Maximaler Sample-Pegel in der Live-Vorschau, angegeben in dBFS.", "Maximum sample level in the live preview, measured in dBFS."], min: -6, max: 0, step: .1, unit: "dBFS" },
  release: { label: ["Release", "Release"], help: ["Bestimmt, wie schnell der Limiter nach einer Pegelspitze wieder loslässt.", "Controls how quickly the limiter lets go after a peak."], min: 25, max: 350, step: 1, unit: "ms" },
} as const;
const moduleControls = {
  input: ["trim"], stereo: ["width", "monoBass"], saturation: ["saturation"],
  deesser: ["deessFrequency", "deessThreshold", "deessAmount"], finalEq: ["finalAir", "finalFrequency"],
  ducking: ["duckDepth", "duckFrequency", "duckThreshold", "duckRelease"],
  bus: ["busThreshold", "busRatio"], limiter: ["drive", "ceiling", "release"],
} as const;
const eqLimits = [[30, 220], [120, 900], [800, 6000], [4000, 16000]] as const;

function Dial({ label, help, helpLabel, value, min, max, step, unit, mode, onChange }: {
  label: string; help: string; helpLabel: string; value: number; min: number; max: number; step: number; unit: string; mode: ControlMode; onChange: (value: number) => void;
}) {
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return <div className={styles.dial}>
    <label className={mode === "knob" ? styles.knob : styles.fader} style={{ "--arc": `${fraction * 270}deg`, "--level": `${fraction * 100}%` } as CSSProperties}>
      {mode === "knob" ? <span className={styles.knobFace} aria-hidden="true"><i /></span>
        : <span className={styles.faderLane} aria-hidden="true"><i /><b /></span>}
      <input type="range" aria-label={label} aria-orientation={mode === "fader" ? "vertical" : "horizontal"} min={min} max={max} step={step} value={value}
        onChange={event => onChange(Number(event.target.value))} />
    </label>
    <div className={styles.dialLabel}>{label}
      <details className={styles.dialHelp}>
        <summary aria-label={`${helpLabel} ${label}`}><Info size={13} aria-hidden="true" /></summary>
        <div>{help}</div>
      </details>
    </div>
    <label className={styles.value}>
      <input aria-label={`${label} (${unit})`} type="number" min={min} max={max} step={step} key={value} defaultValue={value}
        onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }}
        onBlur={event => {
          const field = event.currentTarget;
          const number = field.valueAsNumber;
          const next = Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : value;
          field.value = String(next);
          onChange(next);
        }} />
      <span>{unit}</span>
    </label>
  </div>;
}

const duckingSettings: Settings = { ...neutral, active: { ...neutral.active, eq: false, input: false, ducking: true } };

export default function MasteringLab({ lang, sidechain = false, children }: { lang: "de" | "en"; sidechain?: boolean; children?: ReactNode }) {
  const t = (de: string, en: string) => lang === "en" ? en : de;
  const lng = lang === "en" ? 1 : 0;
  const audioRef = useRef<LabAudio | null>(null);
  const request = useRef(0);
  const [audio, setAudio] = useState<LabAudio | null>(null);
  const [module, selectModule] = useState<Module>(sidechain ? "ducking" : "eq");
  const [settings, setSettings] = useState(sidechain ? duckingSettings : neutral);
  const [help, setHelp] = useState<Module | "overview">();
  const [listenSlot, setListenSlot] = useState<0 | 1>();
  const [slotMatch, setSlotMatch] = useState(true);
  const [moduleSolo, setModuleSolo] = useState<Module>();
  const [engaged, setEngaged] = useState<Module[]>([]);
  const [preset, setPreset] = useState<number | "custom">(0);
  const [basePreset, setBasePreset] = useState(0);
  const [profileLabel, setProfileLabel] = useState("");
  const [profileAdjusted, setProfileAdjusted] = useState(false);
  const [themeId, setThemeId] = useState<UiThemeId>("midnight-cobalt");
  const [controlMode, setControlMode] = useState<ControlMode>("knob");
  const [appliedModules, setAppliedModules] = useState<Partial<Record<Module, { id: string; adjusted: boolean }>>>({});
  const [source, setSource] = useState<{ name: string; file: File; stats: ReturnType<typeof inspect>; original: ReturnType<typeof inspectAudioMetadata> }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [original, setOriginal] = useState(false);
  const [loop, setLoop] = useState(false);
  const [region, setRegion] = useState<[number, number]>([0, 0]);
  const [position, setPosition] = useState(0);
  const [analysis, setAnalysis] = useState(false);
  const [status, setStatus] = useState("");
  const [eqDetails, setEqDetails] = useState(false);
  const [spectrumOnly, setSpectrumOnly] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [marking, setMarking] = useState(false);
  const [levelMatch, setLevelMatch] = useState(false);
  const [deliveryTarget, setDeliveryTarget] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshots>([null, null]);
  const [draft, setDraft] = useState<[number, number]>();
  const activeModules = sidechain ? modules.filter(item => item.id === "ducking") : modules;
  const moduleNames = Object.fromEntries(modules.map(item => [item.id, item.title[lng]])) as Record<Module, string>;
  const controlGuides = Object.fromEntries(Object.entries(moduleControls).map(([key, keys]) => [key, keys.map(control => ({
    label: controls[control].label[lng], help: controls[control].help[lng],
  }))]));
  const drag = useRef<{ id: number; first: number; left: number; width: number; from: number; span: number } | null>(null);
  const inputMeter = useRef<HTMLMeterElement>(null);
  const outputMeter = useRef<HTMLMeterElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const theme = getUiTheme(themeId);
  const names = modules.find(item => item.id === module)!;
  const genrePresets = genreModulePresets(module);
  const modulePresetText = (id: Module) => {
    const config = appliedModules[id];
    if (!config) return;
    const item = (config.id.startsWith("genre-") ? genreModulePresets(id) : modulePresets[id]).find(item => item.id === config.id);
    return item && `${item.name[lng]}${config.adjusted ? t(" · angepasst", " · adjusted") : ""}`;
  };
  const masterPresetText = `${profileLabel || presets[basePreset].name[lng]}${(profileLabel ? profileAdjusted : preset === "custom") ? t(" · angepasst", " · adjusted") : ""}`;
  const comparison = useComparison(audio?.buffer, settings);
  const comparingSlots = listenSlot !== undefined && Boolean(snapshots[0] && snapshots[1]);
  const slotA = useComparison(comparingSlots ? audio?.buffer : undefined, snapshots[0]?.settings ?? neutral);
  const slotB = useComparison(comparingSlots ? audio?.buffer : undefined, snapshots[1]?.settings ?? neutral);
  const slotALufs = slotA.stats?.lufs;
  const slotBLufs = slotB.stats?.lufs;
  const slotLevelsReady = slotA.current && slotB.current && slotALufs != null && slotBLufs != null;
  const monitorSettings = useMemo(() => {
    if (listenSlot !== undefined) return snapshots[listenSlot]?.settings ?? settings;
    return moduleSolo ? { ...settings, active: { ...settings.active, [moduleSolo]: false } } : settings;
  }, [settings, listenSlot, snapshots, moduleSolo]);
  const warnings = settingsWarnings(settings, comparison.current ? comparison.stats?.peak : undefined);
  const beforeLufs = source?.stats.lufs ?? null;
  const afterLufs = comparison.stats?.lufs ?? null;
  const canMatch = beforeLufs !== null && afterLufs !== null;
  const matchDb = levelMatch && canMatch ? Math.max(-18, Math.min(18,
    beforeLufs + (audio?.buffer?.numberOfChannels === 1 ? 10 * Math.log10(2) : 0) - afterLufs)) : 0;
  const listenGain = comparingSlots
    ? (slotMatch && slotLevelsReady ? Math.min(0, (listenSlot === 0 ? slotBLufs - slotALufs : slotALufs - slotBLufs)) : 0)
    : moduleSolo ? 0 : matchDb;
  const measured = comparison.current ? comparison.stats : undefined;
  const ceiling = settings.active.limiter ? settings.ceiling : -.1;
  const headroom = measured ? ceiling - measured.estimatedTruePeak : undefined;
  const gap = deliveryTarget !== null && measured?.lufs != null ? deliveryTarget - measured.lufs : undefined;
  const atTarget = gap !== undefined && headroom !== undefined && Math.abs(gap) <= .55 && headroom >= 0;
  const needsLimiting = headroom !== undefined && gap !== undefined && gap > Math.max(0, headroom) + .55;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(preference);
      if (isUiTheme(stored)) setThemeId(stored);
      const controls = localStorage.getItem(controlPreference);
      if (controls === "knob" || controls === "fader") setControlMode(controls);
      setSnapshots(storedSnapshots(localStorage.getItem(snapshotKey)));
    } catch {}
    return () => {
      request.current++;
      audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => { audio?.update(monitorSettings, original && !comparingSlots, listenGain); }, [audio, monitorSettings, original, comparingSlots, listenGain]);

  useEffect(() => {
    if (!playing || !audio) {
      setEngaged([]);
      for (const meter of [inputMeter.current, outputMeter.current]) if (meter) meter.value = -60;
      return;
    }
    const meters = [audio.input, audio.output].map(node => ({ node, samples: new Float32Array(node.fftSize) }));
    const tick = setInterval(() => {
      setPosition(audio.time);
      const { deesser, ducking, bands, bus, limit } = audio.reduction;
      const next = ([
        ["deesser", deesser], ["ducking", ducking], ["dynamics", Math.min(...bands)], ["bus", bus], ["limiter", limit],
      ] as const).filter(([, gain]) => gain < .985).map(([key]) => key);
      setEngaged(previous => String(previous) === String(next) ? previous : next);
      meters.forEach(({ node, samples }, i) => {
        node.getFloatTimeDomainData(samples);
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
        const meter = i === 0 ? inputMeter.current : outputMeter.current;
        if (meter) meter.value = Math.max(-60, toDb(peak));
      });
    }, 50);
    return () => clearInterval(tick);
  }, [audio, playing]);

  const update = (patch: Partial<Settings>, target = module) => {
    setListenSlot(undefined);
    setStatus("");
    setSettings(previous => ({ ...previous, ...patch }));
    setPreset("custom");
    setProfileAdjusted(true);
    setAppliedModules(previous => {
      const applied = previous[target];
      return applied ? { ...previous, [target]: { ...applied, adjusted: true } } : previous;
    });
  };

  const choose = (index: number) => {
    setListenSlot(undefined);
    setModuleSolo(undefined);
    setStatus("");
    setSettings(presetSettings(index));
    setPreset(index);
    setBasePreset(index);
    setProfileLabel("");
    setProfileAdjusted(false);
    setAppliedModules({});
    setOriginal(false);
  };

  function saveSnapshot(index: number) {
    const next = [...snapshots] as Snapshots;
    next[index] = { settings, target: deliveryTarget, label: masterPresetText.slice(0, 80) };
    setSnapshots(next);
    try { localStorage.setItem(snapshotKey, JSON.stringify(next)); } catch {}
  }

  function restoreSnapshot(index: number) {
    const snapshot = snapshots[index];
    if (!snapshot) return;
    setListenSlot(undefined);
    setModuleSolo(undefined);
    setSettings(snapshot.settings);
    setDeliveryTarget(snapshot.target);
    setPreset("custom");
    setAppliedModules({});
    setOriginal(false);
    setProfileLabel(`${t("Stand", "Snapshot")} ${index ? "B" : "A"} · ${snapshot.label}`);
    setProfileAdjusted(false);
  }

  async function load(input?: File) {
    const id = ++request.current;
    setPending(true);
    setError("");
    try {
      if (input && input.size > 64 * 1024 * 1024) throw new RangeError("file");
      const engine = audioRef.current ?? new LabAudio();
      audioRef.current = engine;
      if (engine !== audio) await engine.ready;
      const payload = input ? await input.arrayBuffer() : await fetch(demo).then(response => {
        if (!response.ok) throw new Error("demo");
        return response.arrayBuffer();
      });
      const trackFile = input ?? new File([payload], "Xplore Belgium.mp3", { type: "audio/mpeg" });
      const original = inspectAudioMetadata(payload);
      const buffer = await decodeAudioBytes(payload, original);
      if (id !== request.current) return;
      if (buffer.duration > 12 * 60 || buffer.numberOfChannels > 2) throw new RangeError("format");
      engine.reset();
      engine.buffer = buffer;
      engine.finished = () => { setPlaying(false); setPosition(0); };
      setAudio(engine);
      setPlaying(false);
      setPosition(0);
      setZoom(1);
      setLoop(false);
      setMarking(false);
      setDraft(undefined);
      drag.current = null;
      setRegion([0, buffer.duration]);
      setAnalysis(false);
      setSource({ name: input?.name ?? "Xplore Belgium", file: trackFile, stats: inspect(buffer), original });
    } catch (failure) {
      if (id !== request.current) return;
      const range = failure instanceof RangeError;
      setError(range
        ? t("Bitte eine Mono- oder Stereodatei bis 64 MB und 12 Minuten wählen.", "Choose a mono or stereo file up to 64 MB and 12 minutes.")
        : t("Audio konnte nicht geöffnet werden. Versuche es mit WAV, MP3 oder dem Demo-Track.", "Audio could not be opened. Try WAV, MP3, or the demo track."));
      if (!audio) {
        audioRef.current?.close();
        audioRef.current = null;
      }
    } finally {
      if (id === request.current) setPending(false);
    }
  }

  function seek(next: number) {
    setPosition(next);
    if (playing) audio?.start(next, loop ? region : undefined);
  }

  async function play() {
    if (!audio) return;
    if (playing) {
      audio.stop();
      setPosition(audio.time);
      setPlaying(false);
      return;
    }
    try {
      await audio.context.resume();
      audio.start(position, loop ? region : undefined);
      setPlaying(true);
    } catch {
      setError(t("Wiedergabe konnte nicht starten.", "Playback could not start."));
    }
  }

  const duration = source?.stats.seconds ?? 0;
  function applyPassage(first: number, last: number) {
    const length = Math.min(duration, Math.max(Math.min(.25, duration), Math.abs(last - first)));
    const start = Math.max(0, Math.min(duration - length, Math.min(first, last)));
    const next: [number, number] = [start, start + length];
    setRegion(next);
    setLoop(true);
    setPosition(start);
    setMarking(false);
    setDraft(undefined);
    if (playing) audio?.start(start, next);
  }

  function clearPassage() {
    setMarking(false);
    setDraft(undefined);
    drag.current = null;
    setRegion([0, duration]);
    setLoop(false);
    if (playing) audio?.start(audio.time);
  }

  function dragTime(clientX: number) {
    const current = drag.current;
    return current ? current.from + current.span * Math.max(0, Math.min(1, (clientX - current.left) / current.width)) : 0;
  }

  const visible = duration / zoom;
  const windowStart = draft && drag.current ? drag.current.from
    : visible ? Math.min(Math.max(0, duration - visible), Math.floor(position / visible) * visible) : 0;
  const windowEnd = windowStart + visible;
  const wavePosition = (seconds: number) => visible ? (seconds - windowStart) / visible * 100 : 0;
  const selected = draft ?? region;
  const loopLeft = Math.max(windowStart, selected[0]);
  const loopRight = Math.min(windowEnd, selected[1]);
  const detailTime = (seconds: number) => zoom > 1
    ? `${time(seconds)}.${Math.floor(seconds % 1 * 10)}`
    : time(seconds);
  const style = {
    "--lab-bg": theme.bg, "--lab-panel": theme.panel, "--lab-card": theme.card, "--lab-inset": theme.inset,
    "--lab-text": theme.text, "--lab-muted": theme.muted, "--lab-line": theme.line, "--lab-accent": theme.accent,
    "--lab-second": theme.second, "--lab-face": theme.face2, "--lab-shade": theme.face3, colorScheme: theme.light ? "light" : "dark",
  } as CSSProperties;

  const helpLabel = t("Hilfe zu", "Help for");
  const reductionModule = module === "bus" || module === "dynamics" || module === "limiter" || module === "deesser" || module === "ducking";
  const showSpectrum = spectrumOnly || (!reductionModule && module !== "stereo");
  const screenTitle = module === "eq" ? t("Frequenzgang & Live-Spektrum", "Frequency response & live spectrum")
    : module === "stereo" ? t("Live-Phasenkorrelation", "Live phase correlation")
    : module === "ducking" ? t("Tiefbass-Absenkung · Live", "Live low-end ducking")
    : reductionModule ? t("Live-Pegelreduktion", "Live gain reduction") : t("Live-Ausgangsspektrum", "Live output spectrum");
  const spectrumTitle = t("Live-Spektrum · Original und Bearbeitung", "Live spectrum · original and processed");
  const scale = module === "stereo" ? ["−1", "0", "+1"] : module === "dynamics" ? ranges : [names.title[lng]];

  return <main lang={lang} className={styles.lab} data-light={theme.light} style={style}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.home} href={lang === "en" ? "/en" : "/"}><ArrowUpLeft size={16} /> Beatzucker</Link>
        <div className={styles.preferences}>
          <div className={styles.controlSwitch} role="group" aria-label={t("Reglertyp", "Control style")}>
            {(["knob", "fader"] as const).map(kind => <button key={kind} type="button" aria-pressed={controlMode === kind} onClick={() => {
              setControlMode(kind);
              try { localStorage.setItem(controlPreference, kind); } catch {}
            }}>{kind === "knob" ? t("Drehregler", "Knobs") : t("Fader", "Faders")}</button>)}
          </div>
          <label><span>{t("Farbschema", "Color theme")}</span><select aria-label={t("Farbschema", "Color theme")} value={themeId} onChange={event => {
            const next = event.target.value;
            if (!isUiTheme(next)) return;
            setThemeId(next);
            try { localStorage.setItem(preference, next); } catch {}
          }}>{UI_THEMES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <Link href={`${lang === "en" ? "" : "/en"}${sidechain ? "/tools/kick-bass-sidechain" : "/mastering-lab"}`} hrefLang={lang === "en" ? "de" : "en"}>{t("EN", "DE")}</Link>
        </div>
      </header>
      <div className={styles.heading}>
        <div><h1>{sidechain ? t("Kick & Bass Sidechain für EDM", "Kick & Bass Sidechain for EDM") : "Mastering Lab"}</h1>
          <p>{sidechain ? t("Eigenen Stereotrack öffnen und Bass-Ducking bei Kick-Impulsen live hören.", "Open your stereo track and audition kick-triggered bass ducking live.") : t("Manuelles Online-Mastering mit Live-Vorschau.", "Manual online mastering with live monitoring.")}</p></div>
        <div className={styles.jumpLinks}>
          {!sidechain && <a href="#lab-autoprof">{t("Auto-Master-Werte", "Auto-master settings")}</a>}
          <a href="#lab-delivery">{t("Export", "Export")}</a>
          <button type="button" onClick={() => setHelp("overview")}><Info size={14} aria-hidden="true"/> {t("Hilfe", "Help")}</button>
        </div>
      </div>

      <div className={styles.console}>
        <section className={styles.transport} aria-label={t("Audiodatei", "Audio file")}>
          <div className={styles.trackHead}>
            <div className={styles.trackName}><AudioLines size={22} /><div><strong>{source?.name ?? t("Track öffnen", "Open a track")}</strong>
              <small>{source ? `${time(duration)} · ${t("Bearbeitung", "Processing")} ${(source.stats.rate / 1000).toFixed(1)} kHz · ${source.original ? `${t("Datei", "File")} ${source.original.sampleRate / 1000} kHz / ${source.original.channels === 1 ? "Mono" : "Stereo"}` : t("Originalrate im Browser nicht ermittelbar", "Source rate unavailable in browser")}` : t("Audiodateien werden im Browser verarbeitet.", "Audio files are processed in your browser.")}</small></div>
            </div>
            <div className={styles.actions}>
              <input ref={file} type="file" accept="audio/*,.wav,.mp3,.flac,.aiff,.aif,.m4a" hidden onChange={event => {
                const track = event.target.files?.[0];
                if (track) void load(track);
                event.target.value = "";
              }} />
              <button disabled={pending} onClick={() => file.current?.click()}><Upload size={16} /> {t("Datei öffnen", "Open file")}</button>
              <button className={styles.primary} disabled={pending} onClick={() => void load()}>{t("Demo laden", "Load demo")}</button>
            </div>
          </div>
          {error && <p className={styles.message} role="alert">{error}</p>}
          {pending && <p className={styles.message} role="status">{t("Audio wird geladen …", "Loading audio…")}</p>}
        </section>
        <section className={styles.waveDock} data-ready={Boolean(source)} aria-label={t("Wellenformen und Wiedergabe", "Waveforms and playback")}>
          <div className={styles.waveTools}>
            <label>{t("Wellenform-Zoom", "Waveform zoom")} <select value={zoom} disabled={!source} onChange={event => setZoom(+event.target.value)}>
              {[1, 2, 4, 8, 16].map(factor => <option key={factor} value={factor}>{factor}×</option>)}
            </select></label>
            <button aria-label={t("Vorheriger Ausschnitt", "Previous section")} disabled={!source || zoom === 1 || windowStart === 0}
              onClick={() => seek(Math.max(0, windowStart - visible * .5))}><ChevronLeft size={15} /></button>
            <button aria-label={t("Nächster Ausschnitt", "Next section")} disabled={!source || zoom === 1 || windowEnd >= duration - .0001}
              onClick={() => seek(Math.min(duration, windowEnd + visible * .5))}><ChevronRight size={15} /></button>
            <span>{detailTime(windowStart)} – {detailTime(windowEnd)}</span>
          </div>
          <div className={styles.waveDeck}>
            <div className={styles.waveLabels}>
              <span data-track="original">Original {source && <small>{source.stats.peak.toFixed(1)} dBFS</small>}</span>
              <span data-track="processed">{t("Master-Vorschau", "Master preview")} {comparison.current && comparison.stats && <small>{comparison.stats.peak.toFixed(1)} dBFS</small>}</span>
            </div>
            <div className={styles.wave}>
              {[source?.stats.waveform, comparison.stats?.waveform].map((peaks, row) => (
                <div key={row} className={styles.waveRow} data-track={row === 0 ? "original" : "processed"} data-ready={Boolean(peaks)} aria-hidden="true">
                  {peaks && duration > 0 && <WaveformDisplay waveform={peaks} from={windowStart / duration} to={windowEnd / duration}
                    color={row === 0 ? theme.second : theme.accent} grid={theme.line} />}
                </div>
              ))}
              {(loop || draft) && loopRight > loopLeft && <span className={styles.loopOverlay} data-draft={Boolean(draft)} aria-hidden="true" style={{ left: `${wavePosition(loopLeft)}%`, right: `${100-wavePosition(loopRight)}%` }} />}
              {source && <span className={styles.playhead} data-playing={playing} aria-hidden="true" style={{ left: `${wavePosition(position)}%` }} />}
              <input type="range" aria-label={t("Wiedergabeposition", "Playback position")} min={windowStart} max={windowEnd || 1} step="any"
                value={Math.min(position, duration)} disabled={!source} onChange={event => seek(+event.target.value)} />
              {marking && <div className={styles.selectionSurface} aria-hidden="true"
                onPointerDown={event => {
                  if (event.button !== 0 || drag.current) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  if (!rect.width) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = { id: event.pointerId, first: 0, left: rect.left, width: rect.width, from: windowStart, span: visible };
                  const first = dragTime(event.clientX);
                  drag.current.first = first;
                  setDraft([first, first]);
                }}
                onPointerMove={event => {
                  if (drag.current?.id !== event.pointerId) return;
                  const first = drag.current.first;
                  const end = dragTime(event.clientX);
                  setDraft([Math.min(first, end), Math.max(first, end)]);
                }}
                onPointerUp={event => {
                  if (drag.current?.id !== event.pointerId) return;
                  const first = drag.current.first, end = dragTime(event.clientX);
                  drag.current = null;
                  if (Math.abs(first - end) < Math.min(.08, visible * .06)) {
                    const length = Math.min(8, visible);
                    const start = Math.max(windowStart, Math.min(windowEnd - length, end - length / 2));
                    applyPassage(start, start + length);
                  } else applyPassage(first, end);
                }}
                onPointerCancel={event => {
                  if (drag.current?.id !== event.pointerId) return;
                  drag.current = null;
                  setDraft(undefined);
                }} />}
            </div>
          </div>
          {comparison.updating && <p className={styles.comparisonStatus} role="status">{t("Master-Wellenform wird aktualisiert …", "Updating master waveform…")}</p>}
          {comparison.error && <p className={styles.comparisonStatus} role="status">{t("Vorschau-Wellenform konnte nicht berechnet werden. Das Live-Abhören ist weiter verfügbar.", "The preview waveform could not be calculated. Live monitoring is still available.")}</p>}
          <div className={styles.controls}>
            <button disabled={!source} onClick={() => void play()} aria-label={playing ? t("Pausieren","Pause") : t("Abspielen","Play")}>
              {playing ? <Pause size={18}/> : <Play size={18}/>}
            </button>
            <span className={styles.clock}>{time(position)} / {time(duration)}</span>
            <button disabled={!source} aria-pressed={loop} onClick={() => {
              setLoop(!loop);
              if (playing) audio?.start(audio.time, !loop ? region : undefined);
            }}><Repeat size={16}/> Loop</button>
            {!sidechain && <div className={styles.masterPresetBadge} data-testid="current-master-preset">
              <span>{t("Master-Preset", "Master preset")}</span> <strong>{masterPresetText}</strong>
              <select aria-label={t("Mastering-Presets", "Mastering presets")} value={preset} onChange={event => choose(+event.target.value)}>
                {preset === "custom" && <option value="custom" disabled>{t("Preset wechseln …", "Change preset…")}</option>}
                <optgroup label={t("Klangcharakter", "Sonic character")}>
                  {presets.slice(0, genreStart).map((item, index) => <option key={index} value={index}>{item.name[lng]}</option>)}
                </optgroup>
                <optgroup label="Genre">
                  {presets.slice(genreStart).map((item, index) => <option key={index} value={index + genreStart}>{item.name[lng]}</option>)}
                </optgroup>
              </select>
            </div>}
          </div>
          <div className={styles.passageTools} role="group" aria-label={t("Passage zum Abhören", "Audition passage")}>
            <button disabled={!source} aria-pressed={marking} onClick={() => {
              if (marking) { setDraft(undefined); drag.current = null; }
              setMarking(!marking);
            }}>{t("Passage markieren", "Mark passage")}</button>
            <button disabled={!source?.stats.energy} onClick={() => {
              const energy = source?.stats.energy;
              if (!energy) return;
              const length = loop && region[1] - region[0] < duration - .001 ? region[1] - region[0] : 8;
              applyPassage(...loudestPassage(energy, duration, length));
            }}><LocateFixed size={14} aria-hidden="true" /> {t("Lauteste Stelle", "Loudest part")}</button>
            <button disabled={!source || (!marking && !loop)} onClick={clearPassage}>{t("Ganzer Track", "Whole track")}</button>
            {loop && <output aria-label={t("Gewählter Bereich", "Selected section")}>{selected[0].toFixed(2)}–{selected[1].toFixed(2)} s</output>}
          </div>
          {marking && <p className={styles.comparisonStatus}>{t("In einer Wellenform ziehen, um den Abhör-Loop festzulegen.", "Drag across either waveform to set the audition loop.")}</p>}
        </section>
        {loop && <div className={styles.loopPanel}>
          <div className={styles.loopRange}>
            <label>{t("Loop-Start", "Loop start")} <span>{region[0].toFixed(1)} s</span><input type="range" aria-label={t("Loop-Start", "Loop start")}
              min={0} max={Math.max(0, region[1] - .25)} step=".05" value={region[0]} onChange={event => {
                const next: [number, number] = [+event.target.value, region[1]];
                setRegion(next);
                if (playing) audio?.start(audio.time, next);
              }} /></label>
            <label>{t("Loop-Ende", "Loop end")} <span>{region[1].toFixed(1)} s</span><input type="range" aria-label={t("Loop-Ende", "Loop end")}
              min={Math.min(duration, region[0] + .25)} max={duration} step=".05" value={region[1]} onChange={event => {
                const next: [number, number] = [region[0], +event.target.value];
                setRegion(next);
                if (playing) audio?.start(audio.time, next);
              }} /></label>
          </div>
        </div>}

        <div className={styles.rack} id="lab-modules">
          <nav className={styles.modules} aria-label={t("Signalkette", "Signal chain")}>
            <h2>{t("Signalkette", "Signal chain")}</h2>
            <p className={styles.chainCount}>{activeModules.filter(({id}) => settings.active[id]).length} / {activeModules.length} {t("aktiv", "active")}</p>
            {activeModules.map(({ id, icon: Icon, title, detail }) => <button key={id} type="button" aria-pressed={id === module} onClick={() => { selectModule(id); setSpectrumOnly(false); }}>
              <Icon size={23}/><span><strong>{title[lng]}</strong><small data-preset={Boolean(appliedModules[id])}>{modulePresetText(id) ?? detail[lng]}</small>
                <small className={styles.chainStatus} data-active={settings.active[id]} data-engaged={!original && !comparingSlots && settings.active[id] && engaged.includes(id)}>
                  {!settings.active[id] ? "Bypass" : !original && !comparingSlots && engaged.includes(id) ? t("Greift ein", "Reducing gain") : t("Aktiv", "Active")}
                </small></span>
            </button>)}
          </nav>
          <section className={styles.module} aria-label={names.title[lng]}>
            <div className={styles.sectionHead}><h2><names.icon size={20} aria-hidden="true" />{names.title[lng]}</h2>
              <div className={styles.moduleActions}>
                <button type="button" onClick={() => setHelp(module)}><Info size={13} aria-hidden="true"/> {t("Hilfe", "Help")}</button>
                {!sidechain && <button type="button" disabled={!settings.active[module] && moduleSolo !== module}
                  aria-pressed={moduleSolo === module} onClick={() => {
                    setOriginal(false); setListenSlot(undefined); setModuleSolo(moduleSolo === module ? undefined : module);
                  }}>{moduleSolo === module ? t("Modul wieder hören", "Hear module again") : t("Kette ohne dieses Modul hören", "Hear chain without this module")}</button>}
                <button type="button" title={t("Nur die Regler dieses Moduls zurücksetzen", "Reset this module’s controls only")} onClick={() => {
                  update(resetModule(module));
                  setAppliedModules(previous => ({ ...previous, [module]: undefined }));
                  setStatus(t("Regler zurückgesetzt.", "Controls reset."));
                }}><RotateCcw size={13} aria-hidden="true" /> Reset</button>
                <button className={styles.bypass} type="button" aria-label="Bypass" aria-pressed={!settings.active[module]}
                  onClick={() => update({ active: { ...settings.active, [module]: !settings.active[module] } })}>
                  <Power size={14} aria-hidden="true" />
                  <span>Bypass <strong>{settings.active[module] ? t("aus", "off") : t("an", "on")}</strong></span>
                </button>
              </div>
            </div>
            <span className={styles.sr} role="status">{status}</span>
            <div className={styles.modulePreset}>
              <div className={styles.modulePresetBadge} data-testid="current-module-preset">
                <span>{t("Modul-Preset", "Module preset")}</span> <strong>{modulePresetText(module) ?? t("Keines gewählt", "None selected")}</strong>
              </div>
              <label><span className={styles.sr}>{t("Modul-Preset auswählen", "Choose module preset")}</span><select aria-label={t("Modul-Preset auswählen", "Choose module preset")} value={appliedModules[module]?.id ?? ""} onChange={event => {
                const selected = [...modulePresets[module], ...genrePresets].find(preset => preset.id === event.target.value);
                if (!selected) return;
                update({ ...resetModule(module), ...selected.settings, active: { ...settings.active, [module]: true } });
                setAppliedModules(previous => ({ ...previous, [module]: { id: selected.id, adjusted: false } }));
                setOriginal(false);
                setStatus(t("Modul-Preset übernommen.", "Module preset applied."));
              }}>
                <option value="" disabled>{t("Preset auswählen", "Choose a preset")}</option>
                <optgroup label={t("Klangcharakter", "Sonic character")}>{modulePresets[module].map(preset => <option key={preset.id} value={preset.id}>{preset.name[lng]}</option>)}</optgroup>
                {genrePresets.length > 0 && <optgroup label="Genre">{genrePresets.map(preset => <option key={preset.id} value={preset.id}>{preset.name[lng]}</option>)}</optgroup>}
              </select></label>
            </div>
            <div className={styles.screen}>
              <div className={styles.scopeHeader}>
                <span>{spectrumOnly ? spectrumTitle : screenTitle}</span>
                {(reductionModule || module === "stereo") && <button aria-pressed={spectrumOnly} onClick={() => setSpectrumOnly(!spectrumOnly)}>
                  {spectrumOnly ? t("Modulmessung", "Module meter") : t("Spektrum", "Spectrum")}
                </button>}
              </div>
              {showSpectrum && <div className={styles.legend}>
                <span data-track="original">Original</span><span data-track="processed">{t("Bearbeitet", "Processed")}</span>
                {module === "eq" && <span style={{ "--lab-eq": theme.third } as CSSProperties}>{t("EQ-Kurve", "EQ curve")}</span>}
              </div>}
              <LabScope audio={audio} selected={module} running={playing} accent={theme.accent} second={theme.second}
                eqColor={theme.third} spectrumOnly={spectrumOnly} eq={settings.eq} eqFrequency={settings.eqFrequency} eqQ={settings.eqQ} highpass={settings.highpass}
                eqActive={settings.active.eq} label={showSpectrum ? spectrumTitle : screenTitle} />
              {showSpectrum ? <div className={`${styles.scale} ${styles.frequencyScale}`}>{spectrumTicks.map(([frequency, label]) =>
                <span key={frequency} style={{ left: `${spectrumPosition(frequency) * 100}%` }}>{label}</span>)}</div>
                : <div className={styles.scale}>{scale.map(label => <span key={label}>{label}</span>)}</div>}
            </div>
            {module === "eq" && <>
              <div className={styles.dials}>{settings.eq.map((value, index) => <Dial key={index} helpLabel={helpLabel} mode={controlMode}
                label={`${[t("Tiefen", "Low shelf"), t("Tiefe Mitten", "Low mids"), t("Präsenz", "Presence"), t("Höhen", "High shelf")][index]} · ${settings.eqFrequency[index]} Hz`}
                help={t("Hebt das ausgewählte Frequenzband an oder senkt es ab. 0 dB lässt es unverändert.", "Boosts or cuts this frequency band. At 0 dB the band stays unchanged.")}
                value={value} min={-9} max={9} step={.05} unit="dB" onChange={next => {
                  if (next !== value) update({ eq: settings.eq.map((gain, i) => i === index ? next : gain) });
                }} />)}</div>
              <button className={styles.detailsToggle} aria-expanded={eqDetails} onClick={() => setEqDetails(!eqDetails)}>
                <SlidersHorizontal size={14} aria-hidden="true" /> {t("Frequenzen & Güte", "Frequencies & Q")}
              </button>
              {eqDetails && <div className={styles.dials}><Dial label={t("Hochpass", "High-pass")} helpLabel={helpLabel} mode={controlMode} unit="Hz"
                value={settings.highpass} min={0} max={200} step={1}
                help={t("Filtert sehr tiefe Frequenzen unterhalb des eingestellten Werts. Bei 0 Hz bleibt der Hochpass offen.", "Filters frequencies below this point. At 0 Hz the high-pass is inactive.")}
                onChange={value => { if (value !== settings.highpass) update({ highpass: value }); }} /></div>}
              {eqDetails && <div className={styles.bands}>{settings.eqFrequency.map((frequency, index) => <div key={index}>
                <h3>{[t("Tiefen", "Low shelf"), t("Tiefe Mitten", "Low mids"), t("Präsenz", "Presence"), t("Höhen", "High shelf")][index]}</h3>
                <Dial label={t("Frequenz", "Frequency")} helpLabel={helpLabel} mode={controlMode} unit="Hz" value={frequency} min={eqLimits[index][0]} max={eqLimits[index][1]} step={1}
                  help={t("Legt fest, an welcher Frequenz dieses Band greift.", "Sets the frequency where this band acts.")}
                  onChange={next => { if (next !== frequency) update({ eqFrequency: settings.eqFrequency.map((hz, i) => i === index ? next : hz) }); }} />
                {(index === 1 || index === 2) && <Dial label="Q" helpLabel={helpLabel} mode={controlMode} unit="Q" value={settings.eqQ[index]} min={.25} max={5} step={.05}
                  help={t("Bestimmt die Breite des Bands. Höhere Werte bearbeiten einen engeren Frequenzbereich.", "Sets the width of the band. Higher values affect a narrower frequency range.")}
                  onChange={next => { if (next !== settings.eqQ[index]) update({ eqQ: settings.eqQ.map((q, i) => i === index ? next : q) }); }} />}
              </div>)}</div>}
            </>}
            {module === "dynamics" && <div className={styles.bands}>{settings.bands.map((band, index) => <div key={index}>
              <h3>{ranges[index]}</h3>
              {(["threshold", "ratio"] as const).map(key => <Dial key={key} helpLabel={helpLabel} mode={controlMode} help={(key === "threshold" ? thresholdHelp : ratioHelp)[lng]}
                label={key === "threshold" ? t("Schwelle", "Threshold") : "Ratio"} unit={key === "threshold" ? "dB" : ":1"}
                value={band[key]} min={key === "threshold" ? -48 : 1} max={key === "threshold" ? 0 : 8} step={key === "threshold" ? .1 : .01}
                onChange={value => {
                  if (value !== band[key]) update({ bands: settings.bands.map((entry, i) => i === index ? { ...entry, [key]: value } : entry) });
                }} />)}
            </div>)}</div>}
            {module === "ducking" && <p className={styles.duckingHint}>
              {t("Erkennt Kick-ähnliche Impulse im Stereomix und senkt den Tiefbass kurz ab. Nutze eine Loop-Passage und Original/Bearbeitet, um den Effekt zu prüfen.", "Detects kick-like transients in the stereo mix and briefly ducks the low end. Loop a section and switch between original and processed to hear the effect.")}
            </p>}
            {module !== "eq" && module !== "dynamics" && <div className={styles.dials}>{moduleControls[module].map(key => {
              const { label, min, max, step, unit, help } = controls[key];
              return <Dial key={key} label={label[lng]} helpLabel={helpLabel} mode={controlMode} help={help[lng]} value={settings[key]} min={min} max={max} step={step} unit={unit}
                onChange={next => { if (next !== settings[key]) update({ [key]: next }); }} />;
            })}</div>}
          </section>
          <aside className={styles.monitor} aria-label={t("Pegelbrücke", "Meter bridge")}>
            <h2><Headphones size={17} /> {t("Pegelbrücke", "Meter bridge")}</h2>
            <label>Original <meter aria-label="Input dBFS" ref={inputMeter} min={-60} max={0} value={-60} /></label>
            <label>{t("Bearbeitet", "Processed")} <meter aria-label="Output dBFS" ref={outputMeter} min={-60} max={0} value={-60} /></label>
            <div className={styles.scale}><span>−60</span><span>−24</span><span>0 dBFS</span></div>
            {(beforeLufs !== null || afterLufs !== null) && <dl className={styles.loudnessReadout}>
              <div><dt>LUFS-I {t("Original", "original")}</dt><dd>{beforeLufs?.toFixed(1) ?? "—"}</dd></div>
              <div><dt>LUFS-I {t("Vorschau", "preview")}</dt><dd>{afterLufs?.toFixed(1) ?? "—"}</dd></div>
            </dl>}
            {source && <section className={styles.levelCard} data-reached={atTarget} aria-label={t("Ausgangspegel", "Output level")}>
              <strong>{atTarget ? t("Zielpegel erreicht", "Target level reached") : t("Ausgangspegel prüfen", "Check output level")}</strong>
              {measured && headroom !== undefined ? <>
                <small>{t("Vorschau-Schätzung", "Preview estimate")} · {measured.lufs == null ? "—" : `${measured.lufs.toFixed(1)} LUFS`} · ≈ {measured.estimatedTruePeak.toFixed(1)} dBTP</small>
                {deliveryTarget !== null && <small>{t("Ziel", "Target")} {deliveryTarget.toFixed(1)} LUFS</small>}
                <p>{headroom < 0 ? t("Spitzengrenze überschritten. Pegel oder Limiter prüfen.", "Above the peak ceiling. Check gain or limiting.")
                  : t(`${headroom.toFixed(1)} dB Reserve bis zur Spitzengrenze. `, `${headroom.toFixed(1)} dB of headroom to the peak ceiling. `) +
                    (needsLimiting ? t("Mehr Lautheit würde stärker begrenzen.", "More loudness would need more limiting.")
                      : gap !== undefined && gap < -.55 ? t("Pegel etwas senken, um das Ziel zu treffen.", "Lower the level slightly to meet the target.")
                        : atTarget || gap === undefined || gap <= .55 ? t("Aktuellen Pegel beibehalten.", "Keep the current level.")
                        : t(`Eingangspegel um bis zu ${Math.min(gap, headroom).toFixed(1)} dB anheben und nachmessen.`, `Try up to ${Math.min(gap, headroom).toFixed(1)} dB of input gain, then measure again.`))}</p>
                {engaged.includes("limiter") && <small>{t("Limiter greift während der Wiedergabe ein.", "The limiter is active during playback.")}</small>}
                {!sidechain && !atTarget && (needsLimiting || headroom < 0 || (gap !== undefined && Math.abs(gap) > .55)) &&
                  <button onClick={() => selectModule(needsLimiting || headroom < 0 ? "limiter" : "input")}>
                    {needsLimiting || headroom < 0 ? t("Zum Limiter", "Open limiter") : t("Eingangspegel prüfen", "Check input gain")}
                  </button>}
                {!sidechain && deliveryTarget === null && <a href="#lab-delivery">{t("Lautheitsziel auswählen", "Choose a loudness target")}</a>}
              </> : <small>{comparison.error ? t("Vorschau konnte nicht gemessen werden.", "Could not measure the preview.") : t("Vorschau wird gemessen …", "Measuring preview…")}</small>}
            </section>}
            {!sidechain && <button className={styles.analyze} disabled={!source || pending} onClick={() => setAnalysis(true)}><SlidersHorizontal size={16}/> {t("Track analysieren", "Analyze track")}</button>}
            {warnings.length > 0 && <section className={styles.warnings} aria-label={t("Hinweise zu Einstellungen", "Setting warnings")}>
              <h3><TriangleAlert size={16} aria-hidden="true" /> {t("Einstellungen prüfen", "Check settings")}</h3>
              <ul>{warnings.map(warning => <li key={warning[lng === 0 ? "de" : "en"]}>
                <button onClick={() => { selectModule(warning.module); setSpectrumOnly(false); }}>
                  {warning[lng === 0 ? "de" : "en"]}
                </button>
              </li>)}</ul>
            </section>}
            {analysis && source && <div className={styles.results}>
              <dl><div><dt>Sample Peak</dt><dd>{source.stats.peak.toFixed(1)} dBFS</dd></div><div><dt>RMS</dt><dd>{source.stats.rms.toFixed(1)} dBFS</dd></div>
                {comparison.current && comparison.stats && <div><dt>{t("Peak bearbeitet", "Processed peak")}</dt><dd>{comparison.stats.peak.toFixed(1)} dBFS</dd></div>}
              </dl>
              <p>{source.stats.peak > -1 ? t("Hohe Pegelspitzen: Eine niedrigere Obergrenze prüfen.", "High sample peaks: audition a lower ceiling.")
                : t("Die Pegelkarte darüber zeigt dir die nutzbare Reserve und den nächsten Schritt.", "The output card above shows the available headroom and the next step.")}</p>
              {source.stats.peak > -1
                ? <button onClick={() => { update({ active: { ...settings.active, limiter: true }, ceiling: -1 }, "limiter"); selectModule("limiter"); setOriginal(false); }}>{t("Limiter übernehmen", "Apply limiter")}</button>
                : <button onClick={() => choose(1)}>{t("Preset übernehmen", "Apply preset")}</button>}
            </div>}
          </aside>
        </div>
      </div>
      {!sidechain && <div className={styles.snapshots} aria-label={t("Bearbeitungsstände", "Snapshots")}>
        <h2>{t("Bearbeitungsstände", "Snapshots")}</h2>
        {snapshots.map((snapshot, index) => {
          const slot = index ? "B" : "A";
          return <div key={slot} className={styles.snapshot}>
            <strong>{slot}</strong><span title={snapshot?.label}>{snapshot?.label || t("Leer", "Empty")}</span>
            <button aria-label={`${t("Stand speichern", "Save snapshot")} ${slot}`} onClick={() => saveSnapshot(index)}>{t("Speichern", "Save")}</button>
            <button aria-label={`${t("Stand laden", "Load snapshot")} ${slot}`} disabled={!snapshot} onClick={() => restoreSnapshot(index)}>{t("Laden", "Load")}</button>
            <button aria-label={`${t("Stand abhören", "Monitor snapshot")} ${slot}`} aria-pressed={listenSlot === index} disabled={!source || !snapshots[0] || !snapshots[1]}
              onClick={() => { setModuleSolo(undefined); setOriginal(false); setListenSlot(index === 0 ? 0 : 1); }}>{t("Abhören", "Monitor")}</button>
          </div>;
        })}
        {comparingSlots && <div className={styles.snapshotMonitor}>
          <button aria-pressed={slotMatch} onClick={() => setSlotMatch(!slotMatch)}>{t("A/B-Pegelabgleich", "A/B level match")}</button>
          {slotMatch && <small>{slotLevelsReady ? t("Lautheit angeglichen", "Loudness matched")
            : slotA.updating || slotB.updating ? t("Lautheiten werden gemessen …", "Measuring loudness…") : t("Kein Pegelabgleich für diesen Track", "Level match unavailable for this track")}</small>}
          <button onClick={() => setListenSlot(undefined)}>{t("Zur aktuellen Bearbeitung", "Back to current edit")}</button>
        </div>}
      </div>}
      {!sidechain && <AccountLabPresets lang={lang} current={{settings,target:deliveryTarget}} onApply={entry=>{
        setSettings(entry.settings);setDeliveryTarget(entry.target);setPreset("custom");setProfileLabel(entry.name);setProfileAdjusted(false);
        setAppliedModules({});setListenSlot(undefined);setModuleSolo(undefined);setOriginal(false);
      }}/>}
      <LabDelivery lang={lang} source={source?.file} buffer={audio?.buffer} settings={settings} target={deliveryTarget} onTarget={setDeliveryTarget} sidechain={sidechain} moduleNames={moduleNames} listeningRegion={loop?region:undefined}
        onProfile={(next, target, name) => {
          setSettings(next);
          setListenSlot(undefined);
          setModuleSolo(undefined);
          setDeliveryTarget(target);
          setPreset("custom");
          setAppliedModules({});
          setOriginal(false);
          setProfileLabel(`Auto · ${name}`);
          setProfileAdjusted(false);
        }} />
      {children}
    </div>
    {source && <div className={styles.compare} role="group" aria-label={t("Abhörsignal", "Monitor source")}>
      <Headphones size={16} aria-hidden="true" />
      {moduleSolo && <small>{t("Abhöre ohne", "Monitoring without")} {moduleNames[moduleSolo]}</small>}
      <button aria-pressed={original && !comparingSlots} onClick={() => { setListenSlot(undefined); setModuleSolo(undefined); setOriginal(true); }}><span aria-hidden="true">A</span> Original</button>
      <button aria-pressed={!original && !comparingSlots && !moduleSolo} onClick={() => { setListenSlot(undefined); setModuleSolo(undefined); setOriginal(false); }}><span aria-hidden="true">B</span> {t("Bearbeitet", "Processed")}</button>
      <button className={styles.match} title={t("Gleicht die Lautheit nur fürs Abhören an.", "Matches loudness for monitoring only.")}
        aria-pressed={levelMatch} disabled={!canMatch || comparingSlots || Boolean(moduleSolo)} onClick={() => setLevelMatch(!levelMatch)}>{t("Pegelabgleich", "Level match")}</button>
    </div>}
    {help && <LabHelp lang={lang} selected={help} onClose={() => setHelp(undefined)} moduleNames={moduleNames} sidechain={sidechain} controlGuides={controlGuides}/>}
  </main>;
}
