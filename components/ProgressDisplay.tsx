"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Sliders, BarChart3, ArrowLeftRight, Flame, OctagonAlert, Save, type LucideIcon } from "lucide-react";
import { ProgressStep } from "@/lib/types/mastering";

const ALL_STEPS: { key: string; label: string; icon: LucideIcon; color: string }[] = [
  { key: "analyzing",   label: "Analysis",             icon: Search,         color: "var(--accent-purple)" },
  { key: "eq",          label: "EQ Correction",         icon: Sliders,        color: "rgb(var(--bz-paint-818cf8))" },
  { key: "compression", label: "Multiband Compression", icon: BarChart3,      color: "var(--accent-cyan)" },
  { key: "ms",          label: "M/S-Bearbeitung",       icon: ArrowLeftRight, color: "rgb(var(--bz-paint-22d3ee))" },
  { key: "saturation",  label: "Harmonic Saturation",   icon: Flame,          color: "rgb(var(--bz-paint-c4b5fd))" },
  { key: "limiting",    label: "True Peak Limiting",    icon: OctagonAlert,   color: "rgb(var(--bz-paint-fb923c))" },
  { key: "rendering",   label: "Format Rendering",      icon: Save,           color: "rgb(var(--bz-paint-4ade80))" },
];

// Approximate seconds each step takes (used for ETA)
const STEP_DURATION_S = [4, 6, 8, 5, 5, 4, 6];

interface Props {
  step: ProgressStep;
}

export default function ProgressDisplay({ step }: Props) {
  const currentIdx = ALL_STEPS.findIndex((s) => s.key === step.step);
  const startTimeRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed time every second
  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // Estimated time remaining
  const remainingSteps = STEP_DURATION_S.slice(Math.max(0, currentIdx));
  const estimatedRemaining = remainingSteps.reduce((a, b) => a + b, 0);
  const etaText = estimatedRemaining > 0
    ? estimatedRemaining < 60
      ? `~${estimatedRemaining}s`
      : `~${Math.ceil(estimatedRemaining / 60)}m`
    : "fast";

  const progress = step.progress ?? 0;
  const activeStep = ALL_STEPS[currentIdx] ?? ALL_STEPS[0];

  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(var(--bz-border-38bdf8),0.18)",
        background: "linear-gradient(135deg, rgba(var(--bz-paint-0a0e14),0.95), rgba(var(--bz-paint-060a10),0.98))",
        boxShadow: "0 4px 32px rgba(var(--bz-shadow-38bdf8),0.06), 0 0 0 1px rgba(var(--bz-shadow-ffffff),0.03)",
      }}
    >
      {/* Top header row */}
      <div
        style={{
          padding: "0.875rem 1rem 0.75rem",
          borderBottom: "1px solid rgba(var(--bz-border-ffffff),0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(var(--bz-paint-38bdf8),0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          {/* Pulsing dot */}
          <span style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent-cyan)",
            boxShadow: "0 0 8px rgba(var(--bz-shadow-38bdf8),0.7)",
            animation: "pulse 1.2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.01em" }}>
            {step.label || activeStep.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            ETA {etaText}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {formatTime(elapsed)}
          </span>
          <span style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--accent-cyan)",
            fontVariantNumeric: "tabular-nums",
            minWidth: "2.8rem",
            textAlign: "right",
          }}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Main progress bar */}
      <div style={{ padding: "0.875rem 1rem 0" }}>
        <div style={{
          height: "6px",
          borderRadius: "3px",
          background: "rgba(var(--bz-paint-ffffff),0.06)",
          overflow: "hidden",
          marginBottom: "1rem",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            borderRadius: "3px",
            background: "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))",
            transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "0 0 12px rgba(var(--bz-shadow-38bdf8),0.45)",
            position: "relative",
          }}>
            {/* Shimmer */}
            <div style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "40px",
              height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(var(--bz-paint-ffffff),0.35), transparent)",
              animation: "shimmer 1.5s ease-in-out infinite",
            }} />
          </div>
        </div>

        {/* Step pipeline */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${ALL_STEPS.length}, 1fr)`,
          gap: "2px",
          marginBottom: "0.5rem",
        }}>
          {ALL_STEPS.map((s, i) => {
            const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
            return (
              <div
                key={s.key}
                title={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.4rem 0.2rem",
                  borderRadius: "8px",
                  background: state === "active"
                    ? "rgba(var(--bz-paint-38bdf8),0.08)"
                    : state === "done"
                    ? "rgba(var(--bz-paint-8b5cf6),0.06)"
                    : "transparent",
                  transition: "all 0.3s ease",
                  border: state === "active" ? "1px solid rgba(var(--bz-paint-38bdf8),0.2)" : "1px solid transparent",
                }}
              >
                {/* Step icon/check */}
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: state === "done" ? "0.75rem" : "0.85rem",
                  background: state === "done"
                    ? "rgba(var(--bz-paint-8b5cf6),0.2)"
                    : state === "active"
                    ? "rgba(var(--bz-paint-38bdf8),0.15)"
                    : "rgba(var(--bz-paint-ffffff),0.04)",
                  border: `1px solid ${
                    state === "done" ? "rgba(var(--bz-paint-8b5cf6),0.35)" :
                    state === "active" ? "rgba(var(--bz-paint-38bdf8),0.4)" :
                    "rgba(var(--bz-paint-ffffff),0.08)"
                  }`,
                  transition: "all 0.3s ease",
                  boxShadow: state === "active" ? "0 0 10px rgba(var(--bz-paint-38bdf8),0.25)" : "none",
                }}>
                  {state === "done"
                    ? <span style={{ color: "var(--accent-purple)", fontWeight: 700, fontSize: "0.7rem" }}>✓</span>
                    : state === "active"
                    ? <span style={{ animation: "pulse 1.2s infinite", display: "flex" }}><s.icon size={13} strokeWidth={2} color={s.color} /></span>
                    : <span style={{ opacity: 0.35, display: "flex" }}><s.icon size={13} strokeWidth={2} /></span>
                  }
                </div>

                {/* Label */}
                <span style={{
                  fontSize: "0.58rem",
                  fontWeight: state === "active" ? 700 : 400,
                  color: state === "done"
                    ? "var(--accent-purple)"
                    : state === "active"
                    ? "var(--accent-cyan)"
                    : "var(--text-muted)",
                  textAlign: "center",
                  lineHeight: 1.2,
                  letterSpacing: state === "active" ? "0.02em" : 0,
                  transition: "color 0.3s ease",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}>
                  {s.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connector lines between steps */}
      <div style={{ padding: "0 1rem 0.875rem" }}>
        <div style={{ display: "flex", gap: "2px", height: "3px" }}>
          {ALL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: "2px",
                background: i < currentIdx
                  ? "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))"
                  : i === currentIdx
                  ? "linear-gradient(90deg, var(--accent-cyan), rgba(var(--bz-paint-38bdf8),0.2))"
                  : "rgba(var(--bz-paint-ffffff),0.05)",
                transition: "background 0.4s ease",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translateX(200%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
