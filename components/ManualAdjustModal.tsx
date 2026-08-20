"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw, Play, Pause, Loader2, LocateFixed, Radio } from "lucide-react";
import {
  PARAM_DEFS, TABS, seedValues, changedOnly, formatValue, t,
  type ParamKey, type ParamValues, type TabId, type ParamDef,
} from "@/lib/masteringParams";
import { GoniometerScope, SaturationScope, GainReductionScope, MultibandScope } from "@/components/manual/AdjustScopes";
import { ManualPreviewEngine } from "@/lib/manualPreviewEngine";
import { stopGlobalAudio } from "@/lib/globalAudio";
import type { AnalysisData, Lang, Platform, Preset } from "@/lib/types/mastering";

interface Props {
  open: boolean; onClose: () => void; lang?: Lang; fileId: string; uploadToken: string; filename: string;
  durationSec: number; platform: Platform; preset: Preset; intensity: number;
  analysis: AnalysisData | null; referenceAnalysis?: AnalysisData | null;
  serverParams?: Record<string, unknown> | null;
  onApply: (overrides: ParamValues) => void;
}

const Fader = memo(function Fader({ def, value, onChange, lang }: {
  def: ParamDef; value: number; lang: Lang; onChange: (key: ParamKey, value: number) => void;
}) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  const neutral = def.neutral !== undefined && Math.abs(value - def.neutral) < def.step / 2;
  return <div className={`adjust-channel${neutral ? " is-neutral" : ""}`}>
    <span className="adjust-readout">{formatValue(def, value)}</span>
    <div className="adjust-faderwrap">
      <div className="adjust-fadertrack"><div className="adjust-faderfill" style={{ height: `${pct}%` }} /></div>
      <div className="adjust-faderthumb" style={{ bottom: `${pct}%` }} />
      <input className="adjust-fadinput" type="range" min={def.min} max={def.max} step={def.step} value={value}
        aria-label={t(def.label, lang)} onChange={(event) => onChange(def.key, Number(event.target.value))} />
    </div>
    <span className="adjust-name">{t(def.label, lang)}</span><span className="adjust-unit">{t(def.unit, lang)}</span>
  </div>;
});

function EqCurve({ values }: { values: ParamValues }) {
  const path = useMemo(() => {
    const gains = [values.low_shelf_gain ?? 0, values.mid_notch_gain ?? 0, values.presence_gain ?? 0, values.air_gain ?? 0];
    const xs = [90, 300, 550, 790];
    const points: string[] = [];
    for (let x = 0; x <= 900; x += 12) {
      let y = 28;
      gains.forEach((gain, index) => { const d = (x - xs[index]) / 175; y -= gain * 3.2 * Math.exp(-d * d); });
      points.push(`${x},${y.toFixed(1)}`);
    }
    return `M${points.join(" L")}`;
  }, [values]);
  return <svg className="adjust-eqcurve" viewBox="0 0 900 56" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="bz-eqfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#48bfff" stopOpacity=".32" /><stop offset="100%" stopColor="#48bfff" stopOpacity="0" /></linearGradient></defs>
    <path d={`${path} L900,56 L0,56 Z`} fill="url(#bz-eqfill)" /><path d={path} fill="none" stroke="#48bfff" strokeWidth="2" strokeLinecap="round" />
    <line x1="0" y1="28" x2="900" y2="28" stroke="rgba(255,255,255,.08)" />
  </svg>;
}

function SpectrumBackdrop({ analyser, playing }: { analyser: AnalyserNode | null; playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let width = 1, height = 1, raf = 0;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height; canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
    const draw = () => {
      ctx.clearRect(0, 0, width, height); if (analyser && data && playing) analyser.getByteFrequencyData(data);
      const count = 52;
      for (let i = 0; i < count; i++) {
        const bin = Math.max(0, Math.min((data?.length ?? 1) - 1, Math.round(Math.pow(i / count, 1.8) * (data?.length ?? 1) * .7)));
        const level = playing && data ? data[bin] / 255 : .06, bar = Math.max(2, level * height * .72);
        ctx.fillStyle = `rgba(${72 + i * 2},${191 - i},255,${.08 + level * .22})`;
        ctx.fillRect(i / count * width, height - bar, Math.max(1, width / count - 2), bar);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [analyser, playing]);
  return <canvas ref={ref} className="adjust-spectrum" aria-hidden="true" />;
}

const emptyBars = Array.from({ length: 240 }, () => .08);

export default function ManualAdjustModal({ open, onClose, lang = "de", fileId, uploadToken, filename, durationSec, analysis, serverParams, onApply }: Props) {
  const base = useMemo(() => seedValues(serverParams), [serverParams]);
  const [values, setValues] = useState<ParamValues>(base), valuesRef = useRef(values); valuesRef.current = values;
  const [tab, setTab] = useState<TabId>("eq");
  const dur = Math.max(1, durationSec);
  const regionRef = useRef({ start: Math.max(0, dur * .35), len: Math.min(8, dur) });
  const [region, setRegion] = useState({ ...regionRef.current });
  const dragRef = useRef<{ ratio: number; start: number; moved: boolean } | null>(null);
  const waveRef = useRef<HTMLCanvasElement>(null), chipTimeRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<ManualPreviewEngine | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null), [playing, setPlaying] = useState(false);
  const [engineBusy, setEngineBusy] = useState(false), [previewError, setPreviewError] = useState<string | null>(null);
  const [waveBars, setWaveBars] = useState(emptyBars), [waveLoading, setWaveLoading] = useState(false);
  const [auditionBase, setAuditionBase] = useState(false), auditionBaseRef = useRef(false);
  const sourceUrl = useMemo(
    () => `/api/preview?file_id=${encodeURIComponent(fileId)}&upload_token=${encodeURIComponent(uploadToken)}`,
    [fileId, uploadToken],
  );
  const waveformUrl = useMemo(
    () => `/api/waveform?file_id=${encodeURIComponent(fileId)}&upload_token=${encodeURIComponent(uploadToken)}`,
    [fileId, uploadToken],
  );
  const startSec = region.start, endSec = Math.min(dur, region.start + region.len);
  const dirty = useMemo(() => Object.keys(changedOnly(values, base)).length, [values, base]);
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const destroyEngine = useCallback(() => {
    engineRef.current?.destroy(); engineRef.current = null; setAnalyser(null); setPlaying(false); setEngineBusy(false);
  }, []);
  useEffect(() => {
    if (open) {
      setValues(base); setPreviewError(null); setAuditionBase(false); auditionBaseRef.current = false; stopGlobalAudio();
      const next = { start: Math.max(0, dur * .35), len: Math.min(8, dur) }; regionRef.current = next; setRegion({ ...next });
    } else destroyEngine();
  }, [open, base, dur, destroyEngine]);
  useEffect(() => destroyEngine, [destroyEngine]);

  useEffect(() => {
    if (!open || !fileId) return;
    const aborter = new AbortController(); setWaveLoading(true);
    void (async () => {
      try {
        const response = await fetch(waveformUrl, { signal: aborter.signal }); if (!response.ok) throw new Error("waveform");
        const payload: unknown = await response.json();
        const peaks = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as { peaks?: unknown }).peaks : null;
        if (!Array.isArray(peaks) || peaks.length !== 240 || peaks.some((value) => typeof value !== "number" || !Number.isFinite(value))) throw new Error("waveform");
        if (!aborter.signal.aborted) setWaveBars(peaks as number[]);
      } catch {
        if (!aborter.signal.aborted) {
          setWaveBars(emptyBars);
          setPreviewError(lang === "en" ? "The waveform could not be analyzed." : "Die Wellenform konnte nicht analysiert werden.");
        }
      }
      finally { if (!aborter.signal.aborted) setWaveLoading(false); }
    })();
    return () => aborter.abort();
  }, [open, fileId, waveformUrl, lang]);

  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      const engine = new ManualPreviewEngine(
        sourceUrl,
        valuesRef.current,
        analysis?.integrated_lufs ?? -18,
        analysis?.true_peak ?? -6,
      );
      engine.onState(setPlaying);
      engine.setRegion(regionRef.current.start, regionRef.current.start + regionRef.current.len); engineRef.current = engine; setAnalyser(engine.analyser);
    }
    return engineRef.current;
  }, [sourceUrl, analysis?.integrated_lufs, analysis?.true_peak]);
  const setParam = useCallback((key: ParamKey, value: number) => setValues((previous) => {
    const next = { ...previous, [key]: value }; if (!auditionBaseRef.current) engineRef.current?.update(next); return next;
  }), []);
  const toggleAudition = useCallback(() => {
    const next = !auditionBaseRef.current;
    auditionBaseRef.current = next; setAuditionBase(next);
    engineRef.current?.update(next ? base : valuesRef.current);
  }, [base]);
  const setRegionLive = useCallback((start: number, len: number) => {
    const safeLen = Math.max(1, Math.min(20, Math.min(len, dur)));
    const next = { start: Math.max(0, Math.min(dur - safeLen, start)), len: safeLen }; regionRef.current = next;
    engineRef.current?.setRegion(next.start, next.start + next.len);
  }, [dur]);
  const commitRegion = useCallback(() => setRegion({ ...regionRef.current }), []);
  const ratioAt = useCallback((clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect(); return rect?.width ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
  }, []);

  useEffect(() => {
    if (!open) return;
    const move = (event: PointerEvent) => {
      const drag = dragRef.current; if (!drag) return;
      const delta = (ratioAt(event.clientX) - drag.ratio) * dur; if (Math.abs(delta) > .08) drag.moved = true;
      setRegionLive(drag.start + delta, regionRef.current.len);
    };
    const up = (event: PointerEvent) => {
      const drag = dragRef.current; if (!drag) return;
      if (!drag.moved) setRegionLive(ratioAt(event.clientX) * dur - regionRef.current.len / 2, regionRef.current.len);
      dragRef.current = null; commitRegion();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [open, dur, ratioAt, setRegionLive, commitRegion]);

  const locateLoudest = useCallback(() => {
    const windowBars = Math.max(1, Math.round(regionRef.current.len / dur * waveBars.length));
    let best = 0, bestSum = -1, running = 0;
    for (let i = 0; i < waveBars.length; i++) {
      running += waveBars[i]; if (i >= windowBars) running -= waveBars[i - windowBars];
      if (i >= windowBars - 1 && running > bestSum) { bestSum = running; best = i - windowBars + 1; }
    }
    setRegionLive(best / waveBars.length * dur, regionRef.current.len); commitRegion();
  }, [waveBars, dur, setRegionLive, commitRegion]);

  useEffect(() => {
    const canvas = waveRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx || !open) return;
    let width = 1, height = 1, raf = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); width = rect.width; height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
    const draw = () => {
      const current = regionRef.current, lo = current.start / dur, hi = (current.start + current.len) / dur; ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, 0, height); bg.addColorStop(0, "rgba(72,191,255,.42)"); bg.addColorStop(1, "rgba(139,92,246,.2)");
      const active = ctx.createLinearGradient(0, 0, 0, height); active.addColorStop(0, "#48bfff"); active.addColorStop(1, "#a461ff");
      const bw = width / waveBars.length;
      waveBars.forEach((value, index) => { const ratio = index / waveBars.length, bar = Math.max(2, value * height * .82); ctx.fillStyle = ratio >= lo && ratio <= hi ? active : bg; ctx.fillRect(index * bw + .5, (height - bar) / 2, Math.max(1, bw - 1.4), bar); });
      ctx.fillStyle = "rgba(72,191,255,.075)"; ctx.fillRect(lo * width, 0, (hi - lo) * width, height);
      ctx.strokeStyle = "#48bfff"; ctx.lineWidth = 1.5; ctx.shadowColor = "#48bfff"; ctx.shadowBlur = 7;
      [lo, hi].forEach((ratio) => { ctx.beginPath(); ctx.moveTo(ratio * width, 0); ctx.lineTo(ratio * width, height); ctx.stroke(); }); ctx.shadowBlur = 0;
      const engine = engineRef.current;
      if (engine && !engine.paused) { const x = Math.min(1, engine.currentTime / dur) * width; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.shadowColor = "#48bfff"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); ctx.shadowBlur = 0; }
      if (dragRef.current && chipTimeRef.current) chipTimeRef.current.textContent = `${fmtTime(current.start)}–${fmtTime(current.start + current.len)}`;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [open, waveBars, dur]);

  const togglePlay = useCallback(async () => {
    setEngineBusy(true); setPreviewError(null); stopGlobalAudio();
    try { const engine = ensureEngine(); engine.update(auditionBaseRef.current ? base : valuesRef.current); await engine.toggle(regionRef.current.start, regionRef.current.start + regionRef.current.len); }
    catch { setPreviewError(lang === "en" ? "Live preview could not be started." : "Die Live-Vorschau konnte nicht gestartet werden."); }
    finally { setEngineBusy(false); }
  }, [ensureEngine, lang, base]);

  const tabDefs = PARAM_DEFS.filter((definition) => definition.tab === tab), wide = tab === "ms" || tab === "sat" || tab === "bus";
  return <>{open && <div className="adjust-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog" aria-modal="true">
    <motion.div className="adjust-modal" initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
      <header className="adjust-head"><div><h2><span className="adjust-dot" />{lang === "en" ? "Manual fine-tuning" : "Manuelle Feinabstimmung"}<span className="adjust-live-badge"><Radio size={10} /> LIVE</span></h2>
        <p>{filename}{dirty > 0 && <span className="adjust-dirty"> · {dirty} {lang === "en" ? "changed" : "geändert"}</span>}</p></div>
        <button className="adjust-close" onClick={onClose} aria-label={lang === "en" ? "Close" : "Schließen"}><X size={16} /></button></header>

      <section className="adjust-wave"><div className="adjust-wave-bar"><div className="adjust-transport">
        <button className="adjust-play" onClick={() => void togglePlay()} disabled={engineBusy}>{engineBusy ? <Loader2 size={15} className="adjust-spin" /> : playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <span className="adjust-range-chip"><span ref={chipTimeRef}>{fmtTime(startSec)}–{fmtTime(endSec)}</span>{playing && " · LOOP"}</span>
        <div className="adjust-ab" aria-label={lang === "en" ? "Compare server master and manual changes" : "Server-Master und manuelle Änderungen vergleichen"}>
          <button className={auditionBase ? "is-active" : ""} onClick={() => { if (!auditionBase) toggleAudition(); }} disabled={!dirty}>A <span>{lang === "en" ? "Master" : "Master"}</span></button>
          <button className={!auditionBase ? "is-active" : ""} onClick={() => { if (auditionBase) toggleAudition(); }} disabled={!dirty}>B <span>{lang === "en" ? "Changes" : "Änderungen"}</span></button>
        </div>
        <button className="adjust-loudest" onClick={locateLoudest} disabled={waveLoading}><LocateFixed size={12} />{lang === "en" ? "Loudest part" : "Lauteste Stelle"}</button>
        <div className="adjust-lenpicker">{[5, 8, 12, 20].filter((length) => length <= dur || length === 5).map((length) => <button key={length} className={Math.abs(region.len - Math.min(length, dur)) < .1 ? "is-active" : ""} onClick={() => { const current = regionRef.current; setRegionLive(current.start + current.len / 2 - length / 2, length); commitRegion(); }}>{length}s</button>)}</div>
      </div>{previewError && <span className="adjust-error">{previewError}</span>}</div>
      <canvas ref={waveRef} className="adjust-wave-canvas" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { ratio: ratioAt(event.clientX), start: regionRef.current.start, moved: false }; }} />
      <p className="adjust-hint">{waveLoading ? (lang === "en" ? "Reading waveform…" : "Wellenform wird analysiert…") : (lang === "en" ? "Click to position · drag to move the loop" : "Klicken zum Positionieren · Ziehen verschiebt den Loop")}</p></section>

      <nav className="adjust-tabs" role="tablist">{TABS.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`adjust-tab${tab === item.id ? " is-active" : ""}`} onClick={() => setTab(item.id)}>{t(item.label, lang)}</button>)}</nav>
      <div className={`adjust-strip${wide ? " is-wide" : ""}${tab === "mb" ? " is-multiband" : ""}`}>
        {tab === "eq" && <><SpectrumBackdrop analyser={analyser} playing={playing} /><EqCurve values={values} /></>}
        {tab === "mb" && <MultibandScope analyser={analyser} playing={playing} values={values} lang={lang} />}
        {tabDefs.map((definition) => <div key={definition.key} className={wide ? "adjust-channel-fixed" : "adjust-channel-flex"}><Fader def={definition} value={values[definition.key] ?? definition.min} onChange={setParam} lang={lang} /></div>)}
        {tab === "ms" && <GoniometerScope width={values.stereo_width ?? 1} lang={lang} analyser={analyser} playing={playing} />}
        {tab === "sat" && <SaturationScope drive={values.saturation_amount ?? 0} lang={lang} analyser={analyser} playing={playing} />}
        {tab === "bus" && <GainReductionScope threshold={values.bus_comp_threshold ?? -24} ratio={values.bus_comp_ratio ?? 1.4} lang={lang} analyser={analyser} playing={playing} getReduction={() => engineRef.current?.busReduction ?? 0} />}
      </div>
      <footer className="adjust-foot"><button className="adjust-ghost" disabled={!dirty} onClick={() => { setValues(base); setAuditionBase(false); auditionBaseRef.current = false; engineRef.current?.update(base); }}><RotateCcw size={13} />{lang === "en" ? "Reset" : "Zurücksetzen"}</button>
        <div className="adjust-live-note"><span />{lang === "en" ? "Instant Web Audio preview · final export uses the full mastering engine" : "Sofortige Web-Audio-Vorschau · finaler Export nutzt die vollständige Mastering-Engine"}</div>
        <button className="adjust-commit" disabled={!dirty} onClick={() => onApply(changedOnly(values, base))}>{lang === "en" ? "Create new master" : "Neuen Master erstellen"}</button></footer>
    </motion.div>
  </div>}</>;
}
