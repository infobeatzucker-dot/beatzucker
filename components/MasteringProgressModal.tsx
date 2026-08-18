"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ProgressStep } from "@/lib/types/mastering";

interface Props {
  isOpen: boolean;
  step: ProgressStep | null;
}

const STEPS = [
  { key: "analyzing",   label: "Analyzing track…" },
  { key: "eq",          label: "Applying EQ…" },
  { key: "compression", label: "Compression…" },
  { key: "ms",          label: "M/S processing…" },
  { key: "saturation",  label: "Saturation…" },
  { key: "limiting",    label: "Limiting…" },
  { key: "rendering",   label: "Rendering…" },
];

export default function MasteringProgressModal({ isOpen, step }: Props) {
  const progress = step?.progress ?? 0;
  const label    = step?.label    ?? "Processing…";

  // Which step index is active (for the step dots)
  const activeIdx = STEPS.findIndex((s) => s.key === step?.step);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ background: "rgba(4,5,10,0.85)", backdropFilter: "blur(8px)" }}
          />

          {/* Modal card */}
          <motion.div
            key="modal-card"
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div
              className="w-full max-w-md rounded-2xl p-8"
              style={{
                background: "rgba(14,16,28,0.98)",
                border: "1px solid rgba(139,92,246,0.25)",
                boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 0 120px rgba(56,189,248,0.05), 0 24px 48px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                {/* Spinning ring */}
                <div
                  className="w-8 h-8 rounded-full border-2 border-transparent animate-spin flex-shrink-0"
                  style={{
                    borderTopColor: "var(--accent-purple)",
                    borderRightColor: "var(--accent-cyan)",
                  }}
                />
                <div>
                  <div className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    Mastering läuft…
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Bitte warten — das dauert 1–3 Minuten
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="relative h-2 rounded-full overflow-hidden mb-2"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))",
                    boxShadow: "0 0 12px rgba(139,92,246,0.6)",
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              {/* Percentage + label */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium" style={{ color: "var(--accent-cyan)" }}>
                  {label}
                </span>
                <span className="text-sm font-bold mono" style={{ color: "var(--accent-purple)" }}>
                  {progress}%
                </span>
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => {
                  const done   = activeIdx > i;
                  const active = activeIdx === i;
                  return (
                    <div
                      key={s.key}
                      className="flex-1 h-1 rounded-full transition-all duration-500"
                      style={{
                        background: done
                          ? "var(--accent-cyan)"
                          : active
                          ? "var(--accent-purple)"
                          : "rgba(255,255,255,0.08)",
                        boxShadow: active ? "0 0 8px rgba(139,92,246,0.8)" : "none",
                      }}
                      title={s.label}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Analyse</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Rendering</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
