"use client";
import { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ProgressStep, Lang } from "@/lib/types/mastering";
import { sonicStage } from "@/lib/sonicCore";
import MasteringSonicCore from "@/components/MasteringSonicCore";

interface Props { isOpen: boolean; step: ProgressStep | null; lang?: Lang; completed?: boolean }
const STEPS = ["analyzing", "eq", "compression", "ms", "saturation", "limiting", "rendering"];
const LABELS = { de: ["Analyse", "EQ", "Kompression", "Stereo", "Sättigung", "Limiting", "Export"], en: ["Analysis", "EQ", "Compression", "Stereo", "Saturation", "Limiting", "Export"] };

export default function MasteringProgressModal({ isOpen, step, lang = "de", completed = false }: Props) {
  const reduced = useReducedMotion(), titleId = useId(), descriptionId = useId(), dialog = useRef<HTMLDivElement>(null);
  const completion = useRef(false);
  useEffect(() => { completion.current = completed && !isOpen; }, [completed, isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; dialog.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [isOpen]);
  const stage = sonicStage(step?.step), index = STEPS.indexOf(stage);
  const progress = Number.isFinite(step?.progress) ? Math.round(Math.min(100, Math.max(0, step!.progress))) : 0;
  const label = step?.label || (lang === "de" ? "Mastering wird vorbereitet…" : "Preparing mastering…");
  return <AnimatePresence>
    {isOpen && <motion.div key="mastering-sonic-overlay" className="sonic-progress-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? .1 : .38 }}>
      <motion.div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        className="sonic-progress-card" data-stage={stage}
        onKeyDown={event => { if (event.key === "Tab") { event.preventDefault(); dialog.current?.focus(); } }}
        initial={{ y: reduced ? 0 : 18, scale: reduced ? 1 : .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: reduced ? 0 : -5, scale: 1 }}
        transition={{ duration: reduced ? .1 : .38, ease: [.22, 1, .36, 1] }}>
        <div className="sonic-progress-top"><span><i /> BEATZUCKER / MASTERING</span><span>{stage === "waiting" ? (lang === "de" ? "WARTET" : "QUEUED") : "IN SESSION"}</span></div>
        <div className="sonic-progress-art"><MasteringSonicCore step={step?.step} completed={completion} /><span className="sonic-progress-art-label">SONIC CORE <b>01</b></span></div>
        <div className="sonic-progress-content">
          <div className="sonic-progress-heading"><div><span className="sonic-progress-eyebrow">{lang === "de" ? "DEIN SOUND. IM FOKUS." : "YOUR SOUND. IN FOCUS."}</span><h2 id={titleId}>{lang === "de" ? "Dein Master entsteht." : "Your master is taking shape."}</h2></div><span className="sonic-progress-percentage" aria-hidden="true">{progress}<small>%</small></span></div>
          <p className="sonic-progress-status" role="status" aria-live="polite" aria-atomic="true">{label}</p>
          <div className="sonic-progress-bar" role="progressbar" aria-label={lang === "de" ? "Mastering-Fortschritt" : "Mastering progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${label} ${progress}%`}><div style={{ width: `${progress}%` }} /></div>
          <ol className="sonic-progress-steps" aria-label={lang === "de" ? "Arbeitsschritte" : "Processing stages"}>{STEPS.map((key, i) => <li key={key} className={i === index ? "is-active" : index > i ? "is-done" : ""} aria-current={i === index ? "step" : undefined}><i /><span>{LABELS[lang][i]}</span></li>)}</ol>
          <p id={descriptionId} className="sonic-progress-note">{lang === "de" ? "Visualisierung der Arbeitsschritte · kein Live-Analyzer" : "Processing-stage visualization · not a live analyzer"}</p>
          <p className="sonic-progress-patience">{lang === "de" ? "Die Dauer hängt von Tracklänge und Auslastung ab. Bitte lass diese Seite geöffnet." : "Timing depends on track length and server load. Please keep this page open."}</p>
        </div>
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}
