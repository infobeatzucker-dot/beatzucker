"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown, CloudFog, Disc2, Disc3, Flame, Guitar, Headphones, Mic,
  Mic2, Music2, Music3, Music4, PartyPopper, Radio, Skull, Sparkles,
  Volume2, Wand2, Zap, type LucideIcon,
} from "lucide-react";
import { Preset, type Lang } from "@/lib/types/mastering";

type PresetOption = { id: Preset; label: string; icon: LucideIcon; desc: string };

const PRESETS: PresetOption[] = [
  { id: "electronic", label: "Electronic", icon: Zap, desc: "Druckvoll, breit und laut" },
  { id: "hiphop", label: "Hip-Hop", icon: Mic2, desc: "Kräftiges Bassfundament" },
  { id: "trap", label: "Trap", icon: Volume2, desc: "Harte 808s, klare Höhen" },
  { id: "dance", label: "Dance", icon: Disc3, desc: "Clubtauglich und pumpend" },
  { id: "rock", label: "Rock", icon: Guitar, desc: "Dynamische Gitarren" },
  { id: "pop", label: "Pop", icon: Sparkles, desc: "Poliert und brillant" },
  { id: "rnb", label: "R&B/Soul", icon: Mic, desc: "Warm und weich" },
  { id: "metal", label: "Metal", icon: Skull, desc: "Aggressiv und kraftvoll" },
  { id: "latin", label: "Latin", icon: Flame, desc: "Lebendig und rhythmisch" },
  { id: "country", label: "Country", icon: Music4, desc: "Natürlich und warm" },
  { id: "jazz", label: "Jazz", icon: Music2, desc: "Natürlich und dynamisch" },
  { id: "classical", label: "Klassik", icon: Music3, desc: "Weit und natürlich" },
  { id: "ambient", label: "Ambient", icon: CloudFog, desc: "Räumlich und filmisch" },
  { id: "techno", label: "Techno", icon: Disc2, desc: "Hart und industriell" },
  { id: "edm", label: "EDM", icon: PartyPopper, desc: "Festivaltauglich" },
  { id: "lofi", label: "Lo-Fi", icon: Radio, desc: "Warm und verdichtet" },
  { id: "podcast", label: "Podcast", icon: Headphones, desc: "Für Sprache optimiert" },
];

const EN_TEXT: Partial<Record<Preset, { label?: string; desc: string }>> = {
  electronic: { desc: "Punchy, wide and loud" }, hiphop: { desc: "Heavy low end" }, trap: { desc: "Hard 808s, crisp highs" },
  dance: { desc: "Club-ready and pumping" }, rock: { desc: "Dynamic guitars" }, pop: { desc: "Polished and bright" },
  rnb: { desc: "Warm and smooth" }, metal: { desc: "Aggressive and powerful" }, latin: { desc: "Vibrant and rhythmic" },
  country: { desc: "Natural and warm" }, jazz: { desc: "Natural and dynamic" }, classical: { label: "Classical", desc: "Wide and natural" },
  ambient: { desc: "Spacious and cinematic" }, techno: { desc: "Hard and industrial" }, edm: { desc: "Festival-ready" },
  lofi: { desc: "Warm and compressed" }, podcast: { desc: "Voice optimized" },
};

function PresetTile({ option, active, onClick }: { option: PresetOption; active: boolean; onClick: () => void }) {
  const Icon = option.icon;
  return (
    <button type="button" className={`preset-tile ${active ? "active" : ""}`} onClick={onClick} title={option.desc} aria-pressed={active}>
      <span className="preset-icon"><Icon size={20} strokeWidth={1.8} /></span>
      <strong>{option.label}</strong>
    </button>
  );
}

export default function PresetSelector({ value, onChange, lang = "de" }: { value: Preset; onChange: (p: Preset) => void; lang?: Lang }) {
  const [expanded, setExpanded] = useState(!["auto", ...PRESETS.slice(0, 5).map((item) => item.id)].includes(value));
  const visible = PRESETS.slice(0, 5);
  const additional = PRESETS.slice(5);
  const localize = (option: PresetOption): PresetOption => lang === "de" ? option : {
    ...option,
    label: EN_TEXT[option.id]?.label ?? option.label,
    desc: EN_TEXT[option.id]?.desc ?? option.desc,
  };

  return (
    <div className="preset-picker">
      <div className="control-title-row">
        <span className="label">{lang === "de" ? "Genre-Presets" : "Genre presets"}</span>
        <span className="control-hint">{lang === "de" ? "Klangcharakter" : "Sound character"}</span>
      </div>
      <div className="preset-tile-grid">
        <button
          type="button"
          onClick={() => onChange("auto")}
          className={`preset-tile auto-ai ${value === "auto" ? "active" : ""}`}
          aria-pressed={value === "auto"}
        >
          <span className="preset-icon"><Wand2 size={21} strokeWidth={1.9} /></span>
          <strong>Auto</strong>
          <small>{lang === "de" ? "Empfohlen" : "Recommended"}</small>
        </button>
        {visible.map((option) => <PresetTile key={option.id} option={localize(option)} active={value === option.id} onClick={() => onChange(option.id)} />)}
      </div>

      <button type="button" className="preset-expand" onClick={() => setExpanded((state) => !state)}>
        {expanded ? (lang === "de" ? "Weniger Genres" : "Fewer genres") : `${additional.length} ${lang === "de" ? "weitere Genres" : "more genres"}`}
        <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="preset-tile-grid preset-more-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            {additional.map((option) => <PresetTile key={option.id} option={localize(option)} active={value === option.id} onClick={() => onChange(option.id)} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
