"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw, Play, Pause, Music4, Loader2 } from "lucide-react";
import {
  PARAM_DEFS, TABS, seedValues, changedOnly, formatValue, t,
  type ParamKey, type ParamValues, type TabId, type ParamDef,
} from "@/lib/masteringParams";
import { GoniometerScope, SaturationScope, GainReductionScope } from "@/components/manual/AdjustScopes";
import { stopGlobalAudio } from "@/lib/globalAudio";
import type { AnalysisData, Lang, Platform, Preset } from "@/lib/types/mastering";

interface Props {
  open: boolean;
  onClose: () => void;
  lang?: Lang;
  fileId: string;
  filename: string;
  durationSec: number;
  platform: Platform;
  preset: Preset;
  intensity: number;
  analysis: AnalysisData | null;
  referenceAnalysis?: AnalysisData | null;
  /** Die Parameter, mit denen der aktuelle Master entstanden ist. */
  serverParams?: Record<string, unknown> | null;
  /** Übernimmt die eingestellten Werte und startet ein neues Mastering. */
  onApply: (overrides: ParamValues) => void;
}

/** Ein vertikaler Fader im Stil eines Mischpult-Kanalzugs. */
function Fader({
  def, value, onChange, lang,
}: { def: ParamDef; value: number; onChange: (v: number) => void; lang: Lang }) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  const atNeutral = def.neutral !== undefined && Math.abs(value - def.neutral) < def.step / 2;

  return (
    <div className={`adjust-channel${atNeutral ? " is-neutral" : ""}`}>
      <span className="adjust-readout">{formatValue(def, value)}</span>
      <div className="adjust-faderwrap">
        <div className="adjust-fadertrack">
          <div className="adjust-faderfill" style={{ height: `${pct}%` }} />
        </div>
        <div className="adjust-faderthumb" style={{ bottom: `${pct}%` }} />
        <input
          type="range"
          className="adjust-fadinput"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          aria-label={t(def.label, lang)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
      <span className="adjust-name">{t(def.label, lang)}</span>
      <span className="adjust-unit">{t(def.unit, lang)}</span>
    </div>
  );
}

/** Live-Kurve über den EQ-Fadern — zeigt die Summe der vier Glockenfilter. */
function EqCurve({ values }: { values: ParamValues }) {
  const path = useMemo(() => {
    const gains = [
      values.low_shelf_gain ?? 0,
      values.mid_notch_gain ?? 0,
      values.presence_gain ?? 0,
      values.air_gain ?? 0,
    ];
    const xs = [90, 300, 550, 790];
    const pts: string[] = [];
    for (let x = 0; x <= 900; x += 15) {
      let y = 28;
      for (let i = 0; i < 4; i++) {
        const d = (x - xs[i]) / 175;
        y -= gains[i] * 3.2 * Math.exp(-d * d);
      }
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return `M${pts.join(" L")}`;
  }, [values]);

  return (
    <svg className="adjust-eqcurve" viewBox="0 0 900 56" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="bz-eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#48bfff" stopOpacity=".32" />
          <stop offset="100%" stopColor="#48bfff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L900,56 L0,56 Z`} fill="url(#bz-eqfill)" />
      <path d={path} fill="none" stroke="#48bfff" strokeWidth="2" strokeLinecap="round" />
      <line x1="0" y1="28" x2="900" y2="28" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
    </svg>
  );
}

export default function ManualAdjustModal({
  open, onClose, lang = "de", fileId, filename, durationSec,
  platform, preset, intensity, analysis, referenceAnalysis,
  serverParams, onApply,
}: Props) {
  const base = useMemo(() => seedValues(serverParams), [serverParams]);
  const [values, setValues] = useState<ParamValues>(base);
  const [tab, setTab] = useState<TabId>("eq");

  /**
   * Der Vorhör-Bereich wird als Startsekunde + Länge geführt, nicht als zwei
   * frei gezogene Kanten. Ein einzelner Klick auf die Wellenform genügt damit:
   * er legt den Bereich um den Klickpunkt. Ziehen bleibt für den Feinschliff.
   */
  const [lenSec, setLenSec] = useState(8);
  const [startSec, setStartSec] = useState(() => Math.max(0, durationSec * 0.35));
  // Drag-Zustand bewusst als Ref, nicht als State: die Fenster-Listener müssen
  // schon beim ersten mousemove/mouseup stehen. Über einen State-getriebenen
  // Effekt wäre ein sehr schneller Klick verloren gegangen — genau das ist beim
  // Testen passiert.
  const dragRef = useRef<{ from: number; moved: boolean } | null>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  /** Regler wurden bewegt, seit der laufende Ausschnitt gerendert wurde. */
  const [stale, setStale] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Zählt Render-Anfragen, damit eine überholte Antwort nichts überschreibt. */
  const reqRef = useRef(0);

  useEffect(() => { if (open) setValues(base); }, [open, base]);

  /** Vorhör-Audio verwerfen — der gerenderte Ausschnitt passt nicht mehr. */
  const discardPreview = useCallback(() => {
    reqRef.current++;   // laufende Anfrage entwerten
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setPreviewUrl(null);
    setStale(false);
  }, []);

  useEffect(() => {
    if (open) {
      // Der Haupt-Player läuft womöglich noch. Ohne das hier hört man beim
      // Starten des Ausschnitts beide Spuren gleichzeitig.
      stopGlobalAudio();
      return;
    }
    discardPreview();
    setPreviewError(null);
  }, [open, discardPreview]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const setParam = useCallback((key: ParamKey, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    // Den laufenden Ausschnitt NICHT stoppen: sonst verstummt die Wiedergabe
    // bei jeder Reglerbewegung und es wirkt, als täte sich nichts. Er läuft
    // weiter und wird nur als veraltet markiert — das Nachrendern übernimmt
    // der Effekt unten, sobald man den Regler kurz loslässt.
    setStale(true);
  }, []);

  const dirty = useMemo(() => Object.keys(changedOnly(values, base)).length, [values, base]);

  // ── Wellenform zeichnen ───────────────────────────────────────────────────
  const bars = useMemo(
    () => Array.from({ length: 170 }, (_, i) =>
      0.1 + Math.abs(Math.sin(i * 0.15)) * (0.35 + 0.5 * Math.abs(Math.sin(i * 0.043 + 1.2)))),
    [],
  );

  const dur = Math.max(1, durationSec);
  const endSec = Math.min(dur, startSec + lenSec);
  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  /** Bereich setzen und dabei im Track halten. */
  const placeRegion = useCallback((newStart: number, newLen: number) => {
    const len = Math.max(2, Math.min(20, Math.min(newLen, dur)));
    const st = Math.max(0, Math.min(dur - len, newStart));
    setLenSec(len);
    setStartSec(st);
    // Wie bei den Reglern: laufende Wiedergabe nicht abwürgen, nur als veraltet
    // markieren — der neue Ausschnitt wird automatisch nachgerendert.
    setStale(true);
  }, [dur]);

  const ratioAt = useCallback((clientX: number) => {
    const cv = waveRef.current;
    if (!cv) return 0;
    const r = cv.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }, []);

  // Ziehen für den Feinschliff: erst ab einer knappen halben Sekunde Bewegung,
  // damit ein schlichter Klick nicht versehentlich einen Mini-Bereich aufzieht.
  // Die Listener hängen dauerhaft und lesen den Drag-Zustand aus dem Ref.
  useEffect(() => {
    if (!open) return;
    const move = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const r = ratioAt(e.clientX);
      if (Math.abs(r - d.from) * dur < 0.4) return;
      d.moved = true;
      const a = Math.min(d.from, r) * dur;
      const b = Math.max(d.from, r) * dur;
      placeRegion(a, b - a);
    };
    const up = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      // Reiner Klick ohne Ziehen: Bereich mittig um den Klickpunkt legen
      if (!d.moved) placeRegion(ratioAt(e.clientX) * dur - lenSec / 2, lenSec);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [open, dur, lenSec, placeRegion, ratioAt]);

  // ── Wellenform zeichnen (inkl. Abspielposition) ───────────────────────────
  useEffect(() => {
    const cv = waveRef.current;
    if (!cv || !open) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const render = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) {
        cv.width = Math.round(r.width * dpr);
        cv.height = Math.round(r.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = r.width, h = r.height;
      ctx.clearRect(0, 0, w, h);

      const lo = startSec / dur, hi = endSec / dur;
      const bw = w / bars.length;
      for (let i = 0; i < bars.length; i++) {
        const x = i * bw;
        const bh = bars[i] * h * 0.8;
        const y = (h - bh) / 2;
        const inSel = i / bars.length >= lo && i / bars.length <= hi;
        const g = ctx.createLinearGradient(0, y, 0, y + bh);
        if (inSel) { g.addColorStop(0, "#48bfff"); g.addColorStop(1, "#8b5cff"); }
        else { g.addColorStop(0, "rgba(139,92,246,.45)"); g.addColorStop(1, "rgba(139,92,246,.22)"); }
        ctx.fillStyle = g;
        ctx.fillRect(x + 1, y, Math.max(1, bw - 2), bh);
      }

      ctx.fillStyle = "rgba(72,191,255,.08)";
      ctx.fillRect(lo * w, 0, (hi - lo) * w, h);
      ctx.strokeStyle = "#48bfff";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#48bfff";
      ctx.shadowBlur = 6;
      for (const p of [lo, hi]) {
        ctx.beginPath();
        ctx.moveTo(p * w, 0);
        ctx.lineTo(p * w, h);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Abspielposition: das Vorhör-Audio enthält nur den Ausschnitt, seine
      // Laufzeit wird also auf den markierten Bereich abgebildet.
      const a = audioRef.current;
      if (a && a.duration > 0) {
        const prog = Math.min(1, a.currentTime / a.duration);
        const px = (lo + (hi - lo) * prog) * w;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#48bfff";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px, 5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(cv);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [startSec, endSec, dur, bars, open]);

  // ── Ausschnitt durch die echte Kette rendern ──────────────────────────────
  const renderPreview = useCallback(async () => {
    const token = ++reqRef.current;
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      // Der Haupt-Player darf hier nicht mitlaufen — sonst hört man beide Spuren
      stopGlobalAudio();
      const res = await fetch("/api/adjust-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: fileId,
          start_sec: startSec,
          end_sec: endSec,
          platform, preset, intensity,
          analysis: analysis ?? undefined,
          reference_analysis: referenceAnalysis ?? undefined,
          overrides: changedOnly(values, base),
        }),
      });
      const data = await res.json().catch(() => ({}));
      // Inzwischen weitergedreht oder Panel zu? Dann ist diese Antwort veraltet.
      if (token !== reqRef.current) return;
      if (!res.ok) throw new Error(data?.error || "Vorhören fehlgeschlagen");

      const prev = audioRef.current;
      const a = new Audio(data.url);
      a.loop = true;
      // Nahtlos an der gleichen Stelle weiterhören statt zurück auf Anfang
      const resumeAt = prev && prev.duration > 0 ? prev.currentTime / prev.duration : 0;
      a.addEventListener("loadedmetadata", () => {
        if (a.duration > 0 && resumeAt > 0) a.currentTime = a.duration * resumeAt;
      }, { once: true });
      audioRef.current = a;
      setPreviewUrl(data.url);
      setStale(false);
      await a.play();
      prev?.pause();   // erst jetzt, damit keine Lücke entsteht
      setPlaying(true);
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
    } catch (e) {
      if (token !== reqRef.current) return;
      setPreviewError(e instanceof Error ? e.message : "Vorhören fehlgeschlagen");
    } finally {
      if (token === reqRef.current) setPreviewBusy(false);
    }
  }, [fileId, startSec, endSec, platform, preset, intensity, analysis, referenceAnalysis, values, base]);

  /**
   * Läuft gerade ein Ausschnitt und werden Regler bewegt, wird nach kurzer Ruhe
   * automatisch neu gerendert. Ohne das müsste man nach jeder Reglerbewegung von
   * Hand auf "vorhören" drücken — und hätte den Eindruck, die Regler bewirken
   * nichts. Die Verzögerung fängt das Ziehen ab, damit nicht jede
   * Zwischenstellung einen Render auslöst.
   */
  const renderRef = useRef(renderPreview);
  renderRef.current = renderPreview;
  useEffect(() => {
    if (!stale || !playing || previewBusy) return;
    const id = setTimeout(() => { void renderRef.current(); }, 700);
    return () => clearTimeout(id);
  }, [stale, playing, previewBusy, values, startSec, endSec]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    // Ohne gerenderten Ausschnitt — oder wenn seit dem Rendern Regler bzw.
    // Bereich verändert wurden — erst neu rendern. Sonst liefe der alte Stand
    // weiter und die Änderungen blieben unhörbar.
    if (!a || stale) { void renderPreview(); return; }
    if (a.paused) { stopGlobalAudio(); void a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  }, [renderPreview, stale]);

  const tabDefs = PARAM_DEFS.filter((d) => d.tab === tab);
  const wide = tab === "ms" || tab === "sat" || tab === "bus";

  return (
    /*
     * Bewusst OHNE AnimatePresence-Ausblendung: der Backdrop deckt den ganzen
     * Bildschirm ab und fängt Klicks. Bliebe er nach dem Schließen noch für eine
     * Exit-Animation im DOM, wäre die Seite so lange blockiert — und wenn diese
     * Animation hängt (gedrosseltes requestAnimationFrame in einem Hintergrund-
     * Tab), dauerhaft. Getestet und reproduziert: der Backdrop stand mit
     * opacity 0, pointer-events auto und verdeckte die Seite weiterhin.
     * Ein pointerEvents-Wert im exit-Zustand hilft nicht, den überträgt
     * framer-motion nicht ins DOM. Also unmountet der Backdrop sofort; nur das
     * Einblenden ist animiert, wo kein solcher Zustand entstehen kann.
     */
    <>
      {open && (
        <div
          className="adjust-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          role="dialog" aria-modal="true"
          aria-label={lang === "en" ? "Adjust manually" : "Manuell anpassen"}
        >
          <motion.div
            className="adjust-modal"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <header className="adjust-head">
              <div>
                <h2>
                  <span className="adjust-dot" aria-hidden="true" />
                  {lang === "en" ? "Adjust manually" : "Manuell anpassen"}
                </h2>
                <p>
                  {filename}
                  {dirty > 0 && (
                    <span className="adjust-dirty">
                      {" · "}{dirty} {lang === "en" ? "changed" : "geändert"}
                    </span>
                  )}
                </p>
              </div>
              <button className="adjust-close" onClick={onClose}
                aria-label={lang === "en" ? "Close" : "Schließen"}>
                <X size={16} />
              </button>
            </header>

            <div className="adjust-wave">
              <div className="adjust-wave-bar">
                <div className="adjust-transport">
                  <button className="adjust-play" onClick={togglePlay} disabled={previewBusy}
                    aria-label={playing ? (lang === "en" ? "Pause" : "Pause") : (lang === "en" ? "Play" : "Abspielen")}>
                    {previewBusy ? <Loader2 size={15} className="adjust-spin" />
                      : playing ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <span className="adjust-range-chip">
                    {fmtTime(startSec)}–{fmtTime(endSec)}
                    {previewUrl && !stale && (lang === "en" ? " · looping" : " · läuft in Schleife")}
                  </span>
                  {stale && (
                    <span className="adjust-stale">
                      {previewBusy
                        ? (lang === "en" ? "updating…" : "wird aktualisiert…")
                        : playing
                          ? (lang === "en" ? "updating shortly…" : "wird gleich aktualisiert…")
                          : (lang === "en" ? "press play to hear changes" : "Play drücken, um die Änderung zu hören")}
                    </span>
                  )}
                  <div className="adjust-lenpicker" role="group"
                    aria-label={lang === "en" ? "Section length" : "Ausschnittlänge"}>
                    {[5, 8, 12, 20].map((l) => (
                      <button
                        key={l}
                        className={lenSec === l ? "is-active" : ""}
                        onClick={() => placeRegion(startSec + lenSec / 2 - l / 2, l)}
                      >
                        {l}s
                      </button>
                    ))}
                  </div>
                </div>
                {previewError && <span className="adjust-error">{previewError}</span>}
              </div>
              <canvas
                ref={waveRef}
                className="adjust-wave-canvas"
                onMouseDown={(e) => { dragRef.current = { from: ratioAt(e.clientX), moved: false }; }}
              />
              <p className="adjust-hint">
                {lang === "en"
                  ? "Click the waveform to move the section, or drag for a custom range"
                  : "Klick auf die Wellenform verschiebt den Ausschnitt — Ziehen für einen eigenen Bereich"}
              </p>
            </div>

            <nav className="adjust-tabs" role="tablist">
              {TABS.map((tb) => (
                <button
                  key={tb.id}
                  role="tab"
                  aria-selected={tab === tb.id}
                  className={`adjust-tab${tab === tb.id ? " is-active" : ""}`}
                  onClick={() => setTab(tb.id)}
                >
                  {t(tb.label, lang)}
                </button>
              ))}
            </nav>

            <div className={`adjust-strip${wide ? " is-wide" : ""}`}>
              {tab === "eq" && <EqCurve values={values} />}
              {tabDefs.map((def) => (
                <div key={def.key} className={wide ? "adjust-channel-fixed" : "adjust-channel-flex"}>
                  <Fader
                    def={def}
                    value={values[def.key] ?? def.min}
                    onChange={(v) => setParam(def.key, v)}
                    lang={lang}
                  />
                </div>
              ))}
              {tab === "ms" && <GoniometerScope width={values.stereo_width ?? 1} lang={lang} />}
              {tab === "sat" && <SaturationScope drive={values.saturation_amount ?? 0} lang={lang} />}
              {tab === "bus" && (
                <GainReductionScope
                  threshold={values.bus_comp_threshold ?? -24}
                  ratio={values.bus_comp_ratio ?? 1.4}
                  lang={lang}
                />
              )}
            </div>

            <footer className="adjust-foot">
              <button className="adjust-ghost" onClick={() => { setValues(base); setPreviewUrl(null); }}
                disabled={dirty === 0}>
                <RotateCcw size={13} />
                {lang === "en" ? "Reset" : "Zurücksetzen"}
              </button>
              <div className="adjust-foot-right">
                <button className="adjust-preview" onClick={renderPreview} disabled={previewBusy}>
                  {previewBusy ? <Loader2 size={13} className="adjust-spin" /> : <Music4 size={13} />}
                  {previewBusy
                    ? (lang === "en" ? "Rendering…" : "Wird gerendert…")
                    : (lang === "en" ? "Preview section exactly" : "Ausschnitt genau vorhören")}
                </button>
                <button className="adjust-commit" onClick={() => onApply(changedOnly(values, base))}>
                  {lang === "en" ? "Remaster with these values" : "Neu mastern mit diesen Werten"}
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </>
  );
}
