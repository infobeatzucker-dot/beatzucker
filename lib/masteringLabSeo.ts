import type { Metadata } from "next";

const base = "https://beatzucker.de";
export function masteringLabMetadata(lang: "de" | "en", sidechain = false): Metadata {
  const en = lang === "en";
  const path = sidechain ? "/tools/kick-bass-sidechain" : "/mastering-lab";
  const canonical = base + (en ? "/en" : "") + path;
  const title = sidechain
    ? en ? "Kick & Bass Sidechain Online for EDM | Beatzucker" : "Kick & Bass Sidechain online für EDM | Beatzucker"
    : en ? "Manual Online Mastering with Live Preview | Beatzucker" : "Manuelles Online-Mastering mit Live-Vorschau | Beatzucker";
  const description = sidechain
    ? en ? "Try bass ducking on a stereo EDM track or use a separate kick stem to trigger processing on the bass only. A/B loop and download after activation."
      : "Bass-Ducking im EDM-Stereotrack testen oder mit einer separaten Kickspur nur den Bass absenken. A/B im Loop hören, Download nach Freischaltung."
    : en ? "Master your own music with live EQ, dynamics, stereo and limiting. Compare presets, loop a passage and check loudness and true peak before export."
      : "Musik manuell mit Live-EQ, Dynamik, Stereo und Limiter mastern. Presets vergleichen, Passagen loopen und Lautheit sowie True Peak für den Export prüfen.";
  return {
    title: { absolute: title }, description,
    alternates: { canonical, languages: { "de-DE": base + path, en: base + "/en" + path, "x-default": base + path } },
    openGraph: { type: "website", title, description, url: canonical, locale: en ? "en_US" : "de_DE", alternateLocale: en ? "de_DE" : "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}
