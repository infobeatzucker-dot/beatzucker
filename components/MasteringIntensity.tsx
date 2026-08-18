"use client";

/**
 * MasteringIntensity slider — controls how aggressively the AI masters the track.
 * 0 = very subtle/transparent, 100 = loud/punchy/maximised.
 */

interface Props {
  value: number;          // 0–100
  onChange: (v: number) => void;
}

const PRESETS = [
  { label: "Subtle",    value: 25  },
  { label: "Balanced",  value: 60  },
  { label: "Loud",      value: 85  },
  { label: "Limit",     value: 100 },
];

function getIntensityColor(v: number): string {
  if (v < 40)  return "#8b5cf6";   // purple — subtle
  if (v < 70)  return "#38bdf8";   // cyan — balanced
  if (v < 90)  return "#c4b5fd";   // gold — loud
  return "#ff4757";                // red — max
}

function getIntensityLabel(v: number): string {
  if (v < 30)  return "Transparent";
  if (v < 50)  return "Subtle";
  if (v < 70)  return "Balanced";
  if (v < 85)  return "Punchy";
  if (v < 95)  return "Loud";
  return "Maximum";
}

export default function MasteringIntensity({ value, onChange }: Props) {
  const color = getIntensityColor(value);
  const label = getIntensityLabel(value);
  const pct   = value;

  return (
    <div
      className="glass-panel p-3"
      style={{ border: `1px solid ${color}22` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="label" title="Steuert wie stark das Mastering den Track beeinflusst. Niedrig = transparent, Hoch = laut & punchy.">Mastering Intensity</span>
        <div className="flex items-center gap-1.5">
          <span
            className="mono text-xs font-bold tabular-nums"
            style={{ color }}
          >
            {value}%
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: `${color}18`,
              color,
              border: `1px solid ${color}33`,
              fontSize: 10,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative mb-2.5">
        <div
          className="h-2 rounded-full relative overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {/* Filled portion */}
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, #8b5cf6, ${color})`,
              boxShadow: `0 0 8px ${color}66`,
            }}
          />
        </div>

        {/* Native range input (invisible, sits on top) */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ margin: 0 }}
        />
      </div>

      {/* Quick-preset pills */}
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.value)}
            className="flex-1 py-1 rounded text-xs font-medium transition-all"
            style={{
              background: Math.abs(value - p.value) < 8
                ? `${getIntensityColor(p.value)}22`
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${Math.abs(value - p.value) < 8
                ? getIntensityColor(p.value) + "55"
                : "rgba(255,255,255,0.06)"}`,
              color: Math.abs(value - p.value) < 8
                ? getIntensityColor(p.value)
                : "var(--text-muted)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
