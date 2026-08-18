"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Disc, Play, Smartphone, Settings2, Waves, ShoppingBag, Disc3, Cloud, Disc2, Radio, ChevronDown, type LucideIcon } from "lucide-react";
import { Platform } from "@/lib/types/mastering";

const PLATFORMS: { id: Platform; label: string; lufs: string; icon: LucideIcon }[] = [
  { id: "spotify",    label: "Spotify",      lufs: "−14 LUFS", icon: Music },
  { id: "apple",      label: "Apple Music",  lufs: "−16 LUFS", icon: Disc },
  { id: "youtube",    label: "YouTube",      lufs: "−14 LUFS", icon: Play },
  { id: "tiktok",     label: "TikTok",       lufs: "−13 LUFS", icon: Smartphone },
  { id: "custom",     label: "Custom",       lufs: "Manual",   icon: Settings2 },
];

const MORE_PLATFORMS: { id: Platform; label: string; lufs: string; icon: LucideIcon }[] = [
  { id: "tidal",      label: "Tidal",        lufs: "−14 LUFS", icon: Waves },
  { id: "amazon",     label: "Amazon Music", lufs: "−14 LUFS", icon: ShoppingBag },
  { id: "deezer",     label: "Deezer",       lufs: "−15 LUFS", icon: Disc3 },
  { id: "soundcloud", label: "SoundCloud",   lufs: "−8 LUFS",  icon: Cloud },
  { id: "club",       label: "Club / DJ",    lufs: "−9 LUFS",  icon: Disc2 },
  { id: "broadcast",  label: "Broadcast/TV", lufs: "−23 LUFS", icon: Radio },
];

interface Props {
  value: Platform;
  onChange: (p: Platform) => void;
}

function PlatformButton({ p, active, onClick }: {
  p: { id: Platform; label: string; lufs: string; icon: LucideIcon };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = p.icon;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: active ? "rgba(139,92,246,0.14)" : "rgba(20,24,32,0.6)",
        border: active ? "1px solid rgba(139,92,246,0.55)" : "1px solid var(--border-subtle)",
        color: active ? "var(--accent-purple)" : "var(--text-secondary)",
        boxShadow: active ? "0 0 8px rgba(139,92,246,0.14)" : "none",
      }}
    >
      <Icon size={13} strokeWidth={2} />
      <span>{p.label}</span>
      <span
        className="mono"
        style={{
          fontSize: "10px",
          color: active ? "var(--accent-cyan)" : "var(--text-muted)",
        }}
      >
        {p.lufs}
      </span>
    </button>
  );
}

export default function PlatformTargets({ value, onChange }: Props) {
  const isInMore = MORE_PLATFORMS.some((p) => p.id === value);
  const [expanded, setExpanded] = useState(isInMore);

  return (
    <div>
      <div className="label mb-2">Platform target</div>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <PlatformButton key={p.id} p={p} active={value === p.id} onClick={() => onChange(p.id)} />
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.35)",
            color: "var(--accent-cyan)",
          }}
        >
          {expanded ? "Weniger" : `+${MORE_PLATFORMS.length} weitere`}
          <ChevronDown size={12} strokeWidth={2.5} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-wrap gap-2 mt-2">
              {MORE_PLATFORMS.map((p) => (
                <PlatformButton key={p.id} p={p} active={value === p.id} onClick={() => onChange(p.id)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
