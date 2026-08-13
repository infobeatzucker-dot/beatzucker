"use client";

import { Preset } from "@/app/page";

const PRESETS: { id: Preset; label: string; emoji: string; desc: string }[] = [
  { id: "electronic", label: "Electronic",  emoji: "⚡", desc: "Punchy, wide, loud" },
  { id: "hiphop",     label: "Hip-Hop",     emoji: "🎤", desc: "Heavy low end" },
  { id: "trap",       label: "Trap / Drill", emoji: "🔊", desc: "Hard 808s, crisp highs" },
  { id: "dance",      label: "Dance / House",emoji: "🎛", desc: "Club-ready, pumping" },
  { id: "rock",       label: "Rock",         emoji: "🎸", desc: "Dynamic, guitars" },
  { id: "metal",      label: "Metal",        emoji: "🤘", desc: "Aggressive, powerful" },
  { id: "pop",        label: "Pop",          emoji: "✨", desc: "Polished, bright" },
  { id: "rnb",        label: "R&B / Soul",   emoji: "🎵", desc: "Warm, smooth, groovy" },
  { id: "latin",      label: "Latin",        emoji: "🌶", desc: "Vibrant, rhythmic" },
  { id: "country",    label: "Country",      emoji: "🪕", desc: "Natural, warm" },
  { id: "jazz",       label: "Jazz",         emoji: "🎷", desc: "Natural, dynamic" },
  { id: "classical",  label: "Classical",    emoji: "🎻", desc: "Wide, natural" },
  { id: "ambient",    label: "Ambient",      emoji: "🌌", desc: "Spacious, cinematic" },
  { id: "techno",     label: "Techno",       emoji: "🔩", desc: "Hard, industrial, punchy" },
  { id: "edm",        label: "EDM",          emoji: "🎆", desc: "Festival-ready, massive" },
  { id: "lofi",       label: "Lo-Fi",        emoji: "📻", desc: "Warm, slightly compressed" },
  { id: "podcast",    label: "Podcast",      emoji: "🎙", desc: "Voice optimized" },
];

interface Props {
  value: Preset;
  onChange: (p: Preset) => void;
}

export default function PresetSelector({ value, onChange }: Props) {
  const isAuto = value === "auto";

  return (
    <div>
      <div className="label mb-2">Genre Preset</div>

      {/* Auto AI — featured button */}
      <button
        onClick={() => onChange("auto")}
        className="w-full mb-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
        style={{
          background: isAuto
            ? "linear-gradient(135deg, rgba(124,111,255,0.25), rgba(0,229,196,0.18))"
            : "rgba(124,111,255,0.07)",
          border: isAuto
            ? "1px solid rgba(124,111,255,0.7)"
            : "1px solid rgba(124,111,255,0.25)",
          color: isAuto ? "var(--accent-purple)" : "var(--text-secondary)",
          boxShadow: isAuto
            ? "0 0 20px rgba(124,111,255,0.25), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "none",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated glow sweep when active */}
        {isAuto && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(124,111,255,0.12) 50%, transparent 100%)",
              animation: "glow-sweep 2.5s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
        <span style={{ fontSize: "1rem" }}>🤖</span>
        <span>Auto AI</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{
            background: isAuto ? "rgba(124,111,255,0.3)" : "rgba(124,111,255,0.12)",
            color: "var(--accent-purple)",
            border: "1px solid rgba(124,111,255,0.3)",
            letterSpacing: "0.05em",
          }}
        >
          Empfohlen
        </span>
        {!isAuto && (
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: "auto" }}>
            Analysiert Genre automatisch
          </span>
        )}
      </button>

      {/* Genre grid */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              title={p.desc}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              style={{
                background: active ? "rgba(0,229,196,0.15)" : "rgba(20,24,32,0.8)",
                border: active ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                boxShadow: active ? "0 0 12px rgba(0,229,196,0.15)" : "none",
              }}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
