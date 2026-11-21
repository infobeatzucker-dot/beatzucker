import type { Module, Settings } from "./settings";

export type Warning = { module: Module; de: string; en: string };

export function settingsWarnings(settings: Settings, peak?: number): Warning[] {
  const enabled = settings.active;
  const warnings: Warning[] = [];
  if (peak !== undefined && peak > .02) warnings.push({
    module: "limiter",
    de: "Der bearbeitete Track liegt über 0 dBFS und kann bei der Wiedergabe clippen. Senke den Eingangspegel oder nutze den Limiter.",
    en: "The processed track exceeds 0 dBFS and may clip on playback. Reduce the input level or use the limiter.",
  });
  if (enabled.input && settings.trim >= 8) warnings.push({
    module: "input", de: "Hohe Eingangsverstärkung. Prüfe die Pegelreserve am Ausgang.", en: "High input gain. Check the available output headroom.",
  });
  if (enabled.eq && settings.eq.some(gain => Math.abs(gain) >= 6)) warnings.push({
    module: "eq", de: "Ein EQ-Band ändert den Pegel um mindestens 6 dB. Vergleiche den Klang mit dem Original.", en: "An EQ band is changing the level by at least 6 dB. Compare the sound with the original.",
  });
  if (enabled.deesser && settings.deessAmount >= 72) warnings.push({
    module: "deesser", de: "Starkes De-Essing kann Stimmen und Becken dumpfer machen.", en: "Heavy de-essing can dull vocals and cymbals.",
  });
  if (enabled.ducking && (settings.duckDepth >= 5 || (settings.duckDepth >= 2 && settings.duckRelease >= 280))) warnings.push({
    module: "ducking", de: "Tiefer oder langer Eingriff. Prüfe im A/B-Vergleich, ob die Kick an Druck verliert oder der Bass hörbar pumpt.", en: "Deep or long ducking. Check A/B for weaker kicks or audible bass pumping.",
  });
  if (enabled.dynamics && settings.bands.some(band => band.ratio >= 4 || (band.ratio >= 2 && band.threshold < -36))) warnings.push({
    module: "dynamics", de: "Ein Band wird stark verdichtet. Achte auf Pumpen und weichere Transienten.", en: "One band is set for heavy compression. Listen for pumping and softer transients.",
  });
  if (enabled.stereo && (settings.width >= 140 || settings.width <= 25)) warnings.push({
    module: "stereo", de: settings.width >= 140 ? "Sehr breite Einstellung. Prüfe die Phasenkorrelation und wie der Track in Mono klingt." : "Die Stereobreite ist stark reduziert. Räumliche Details können leiser werden.",
    en: settings.width >= 140 ? "Very wide setting. Check phase correlation and how the track sounds in mono." : "Stereo width is greatly reduced. Spatial details may become quieter.",
  });
  if (enabled.saturation && settings.saturation >= 65) warnings.push({
    module: "saturation", de: "Viel Sättigung rundet Transienten deutlich ab.", en: "Heavy saturation can noticeably soften transients.",
  });
  if (enabled.finalEq && Math.abs(settings.finalAir) >= 4) warnings.push({
    module: "finalEq", de: "Starke Korrektur im Final EQ. Prüfe Zischlaute, Becken und Luftigkeit im A/B-Vergleich.", en: "Strong final EQ adjustment. Compare sibilance, cymbals and air with A/B.",
  });
  if (enabled.bus && (settings.busRatio >= 3 || (settings.busRatio >= 2 && settings.busThreshold < -34))) warnings.push({
    module: "bus", de: "Starke Bus-Kompression kann dem gesamten Mix Dynamik nehmen.", en: "Heavy bus compression can reduce dynamics across the mix.",
  });
  if (enabled.limiter && settings.drive >= 8) warnings.push({
    module: "limiter", de: "Hoher Limiter-Drive. Prüfe die Pegelreduktion und ob die Transienten erhalten bleiben.", en: "High limiter drive. Check gain reduction and listen for changes to the transients.",
  });
  return warnings;
}
