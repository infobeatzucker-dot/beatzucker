"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Zap, Mic2, Volume2, Disc3, Guitar, Skull, Sparkles, Mic,
  Flame, Music4, Music2, Music3, CloudFog, Disc2, PartyPopper, Radio,
  Headphones, ChevronDown, type LucideIcon,
} from "lucide-react";
import { Preset } from "@/lib/types/mastering";

const PRESETS: { id: Preset; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "electronic", label: "Electronic",   icon: Zap,         desc: "Punchy, wide, loud" },
  { id: "hiphop",     label: "Hip-Hop",      icon: Mic2,        desc: "Heavy low end" },
  { id: "trap",       label: "Trap / Drill", icon: Volume2,     desc: "Hard 808s, crisp highs" },
  { id: "dance",      label: "Dance / House",icon: Disc3,       desc: "Club-ready, pumping" },
  { id: "rock",       label: "Rock",         icon: Guitar,      desc: "Dynamic, guitars" },
  { id: "metal",      label: "Metal",        icon: Skull,       desc: "Aggressive, powerful" },
  { id: "pop",        label: "Pop",          icon: Sparkles,    desc: "Polished, bright" },
  { id: "rnb",        label: "R&B / Soul",   icon: Mic,         desc: "Warm, smooth, groovy" },
  { id: "latin",      label: "Latin",        icon: Flame,       desc: "Vibrant, rhythmic" },
  { id: "country",    label: "Country",      icon: Music4,      desc: "Natural, warm" },
  { id: "jazz",       label: "Jazz",         icon: Music2,      desc: "Natural, dynamic" },
  { id: "classical",  label: "Classical",    icon: Music3,      desc: "Wide, natural" },
  { id: "ambient",    label: "Ambient",      icon: CloudFog,    desc: "Spacious, cinematic" },
  { id: "techno",     label: "Techno",       icon: Disc2,       desc: "Hard, industrial, punchy" },
  { id: "edm",        label: "EDM",          icon: PartyPopper, desc: "Festival-ready, massive" },
  { id: "lofi",       label: "Lo-Fi",        icon: Radio,       desc: "Warm, slightly compressed" },
  { id: "podcast",    label: "Podcast",      icon: Headphones,  desc: "Voice optimized" },
];

interface Props {
  value: Preset;
  onChange: (p: Preset) => void;
}

export default function PresetSelector({ value, onChange }: Props) {
  const isAuto = value === "auto";
  const [expanded, setExpanded] = useState(!isAuto);
  const activePreset = PRESETS.find((p) => p.id === value);
  const ActiveIcon = activePreset?.icon;

  return (
    <div>
      <div className="label mb-2">Genre preset</div>

      {/* Auto AI — featured button */}
      <button
        onClick={() => onChange("auto")}
        className="w-full mb-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
        style={{
          background: isAuto
            ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(56,189,248,0.18))"
            : "rgba(139,92,246,0.07)",
          border: isAuto
            ? "1px solid rgba(139,92,246,0.7)"
            : "1px solid rgba(139,92,246,0.25)",
          color: isAuto ? "var(--accent-purple)" : "var(--text-secondary)",
          boxShadow: isAuto
            ? "0 0 20px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.05)"
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
              background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.14) 50%, transparent 100%)",
              backgroundSize: "60% 100%",
              backgroundRepeat: "no-repeat",
              animation: "glow-sweep 3s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
        <Wand2 size={16} strokeWidth={2} />
        <span>Auto AI</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{
            background: isAuto ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.12)",
            color: "var(--accent-purple)",
            border: "1px solid rgba(139,92,246,0.3)",
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

      {/* Toggle for manual genre grid */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: "rgba(56,189,248,0.1)",
          border: "1px solid rgba(56,189,248,0.35)",
          color: "var(--accent-cyan)",
        }}
      >
        <span>{expanded ? "Genre-Liste ausblenden" : "Genre manuell wählen"}</span>
        {!expanded && activePreset && ActiveIcon && (
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{ background: "rgba(56,189,248,0.15)", color: "var(--accent-cyan)", fontSize: "10px" }}
          >
            <ActiveIcon size={10} strokeWidth={2.5} />
            {activePreset.label}
          </span>
        )}
        <ChevronDown size={12} strokeWidth={2.5} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
      </button>

      {/* Genre grid */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESETS.map((p) => {
                const active = value === p.id;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => onChange(p.id)}
                    title={p.desc}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    style={{
                      background: active ? "rgba(56,189,248,0.15)" : "rgba(20,24,32,0.6)",
                      border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid var(--border-subtle)",
                      color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                      boxShadow: active ? "0 0 8px rgba(56,189,248,0.12)" : "none",
                    }}
                  >
                    <Icon size={13} strokeWidth={2} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
