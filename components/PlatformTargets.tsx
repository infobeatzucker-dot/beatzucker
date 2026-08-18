"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check, ChevronDown, Cloud, Disc2, Disc3, Music2, Play, Radio,
  Settings2, ShoppingBag, Smartphone, Waves, type LucideIcon,
} from "lucide-react";
import { Platform, type Lang } from "@/lib/types/mastering";

type PlatformOption = { id: Platform; label: string; short: string; lufs: string; icon?: LucideIcon; tone: string };

const PLATFORMS: PlatformOption[] = [
  { id: "spotify", label: "Spotify", short: "Spotify", lufs: "−14", tone: "#1ed760" },
  { id: "apple", label: "Apple Music", short: "Apple", lufs: "−16", tone: "#fa4d65" },
  { id: "youtube", label: "YouTube", short: "YouTube", lufs: "−14", tone: "#ff3040" },
  { id: "tiktok", label: "TikTok", short: "TikTok", lufs: "−13", icon: Smartphone, tone: "#64d9e7" },
  { id: "custom", label: "Benutzerdefiniert", short: "Eigene", lufs: "frei", icon: Settings2, tone: "#a78bfa" },
];

const MORE_PLATFORMS: PlatformOption[] = [
  { id: "tidal", label: "Tidal", short: "Tidal", lufs: "−14", icon: Waves, tone: "#f3f4f8" },
  { id: "amazon", label: "Amazon Music", short: "Amazon", lufs: "−14", icon: ShoppingBag, tone: "#55c5ff" },
  { id: "deezer", label: "Deezer", short: "Deezer", lufs: "−15", icon: Disc3, tone: "#b87cff" },
  { id: "soundcloud", label: "SoundCloud", short: "SoundCloud", lufs: "−8", icon: Cloud, tone: "#ff7a39" },
  { id: "club", label: "Club / DJ", short: "Club", lufs: "−9", icon: Disc2, tone: "#ee56d8" },
  { id: "broadcast", label: "Rundfunk / TV", short: "TV", lufs: "−23", icon: Radio, tone: "#63c8ff" },
];

function BrandMark({ id, icon: Icon }: Pick<PlatformOption, "id" | "icon">) {
  if (Icon) return <Icon size={21} strokeWidth={1.9} aria-hidden="true" />;
  if (id === "spotify") return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.1c4.8-1.35 10.2-.9 14.2 1.25M6.1 12.5c4-1.05 8.7-.7 12.1 1.1M7 15.7c3.4-.8 7.2-.5 10.1.9" /></svg>
  );
  if (id === "apple") return <Music2 size={21} strokeWidth={2.2} aria-hidden="true" />;
  return <Play size={22} fill="currentColor" strokeWidth={0} aria-hidden="true" />;
}

function PlatformCard({ option, active, onClick }: { option: PlatformOption; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`platform-tile ${active ? "active" : ""}`}
      style={{ "--platform-tone": option.tone } as React.CSSProperties}
      aria-pressed={active}
      title={`${option.label}: ${option.lufs} LUFS`}
    >
      {active && <span className="platform-check"><Check size={9} strokeWidth={3} /></span>}
      <span className="platform-mark"><BrandMark id={option.id} icon={option.icon} /></span>
      <strong>{option.short}</strong>
      <small>{option.lufs} LUFS</small>
    </button>
  );
}

export default function PlatformTargets({ value, onChange, lang = "de" }: { value: Platform; onChange: (p: Platform) => void; lang?: Lang }) {
  const [expanded, setExpanded] = useState(MORE_PLATFORMS.some((item) => item.id === value));
  const localize = (option: PlatformOption): PlatformOption => {
    if (lang === "de") return option;
    if (option.id === "custom") return { ...option, label: "Custom", short: "Custom", lufs: "free" };
    if (option.id === "broadcast") return { ...option, label: "Broadcast / TV" };
    return option;
  };

  return (
    <div className="platform-picker">
      <div className="control-title-row">
        <span className="label">{lang === "de" ? "Plattform-Ziel" : "Platform target"}</span>
        <span className="control-hint">{lang === "de" ? "Streaming-Lautheit" : "Streaming loudness"}</span>
      </div>
      <div className="platform-tile-grid">
        {PLATFORMS.map((option) => (
          <PlatformCard key={option.id} option={localize(option)} active={value === option.id} onClick={() => onChange(option.id)} />
        ))}
        <button type="button" onClick={() => setExpanded((state) => !state)} className="platform-tile platform-more">
          <span className="platform-mark"><ChevronDown size={20} style={{ transform: expanded ? "rotate(180deg)" : undefined }} /></span>
          <strong>{expanded ? (lang === "de" ? "Weniger" : "Less") : (lang === "de" ? "Weitere" : "More")}</strong>
          <small>{MORE_PLATFORMS.length} {lang === "de" ? "Ziele" : "targets"}</small>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="platform-tile-grid platform-more-grid"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            style={{ overflow: "hidden" }}
          >
            {MORE_PLATFORMS.map((option) => (
              <PlatformCard key={option.id} option={localize(option)} active={value === option.id} onClick={() => onChange(option.id)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
