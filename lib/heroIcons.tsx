import {
  SlidersHorizontal,
  BarChart3,
  Scale,
  Bot,
  VolumeX,
  Globe,
  CheckCircle2,
  Save,
  Mic,
  Trophy,
  ArrowLeftRight,
  TrendingUp,
  Binary,
  Medal,
  Sliders,
  type LucideIcon,
} from "lucide-react";

// Maps the `heroIcon` name stored on each ressourcen article (app/data/ressourcen.ts)
// to its lucide-react component. Mirrors the id -> icon mapping pattern used in
// components/PlatformTargets.tsx.
export const HERO_ICONS: Record<string, LucideIcon> = {
  SlidersHorizontal,
  BarChart3,
  Scale,
  Bot,
  VolumeX,
  Globe,
  CheckCircle2,
  Save,
  Mic,
  Trophy,
  ArrowLeftRight,
  TrendingUp,
  Binary,
  Medal,
  Sliders,
};

interface HeroIconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export function HeroIcon({ name, size = 20, strokeWidth = 2, color, className }: HeroIconProps) {
  const Icon = HERO_ICONS[name] ?? SlidersHorizontal;
  return <Icon size={size} strokeWidth={strokeWidth} color={color} className={className} />;
}
