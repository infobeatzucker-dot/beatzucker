import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe & FAQ – Audio Mastering Support",
  description:
    "Antworten auf alle Fragen zu UpMaDo: Quickstart, Mastering-Pipeline, A/B-Player, Plattform-Presets, Tarife, Tastaturkürzel und technische Details.",
  alternates: {
    canonical: "https://upmado.com/help",
  },
  openGraph: {
    title: "UpMaDo Hilfe & FAQ",
    description:
      "Frequently asked questions about UpMaDo audio mastering. Quickstart guide, platform presets, pricing plans, keyboard shortcuts and more.",
    url: "https://upmado.com/help",
  },
};

/* ── FAQ JSON-LD for Google Rich Results ──────────────────────────────────── */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Wie funktioniert UpMaDo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lade eine WAV- oder MP3-Datei hoch, wähle Zielplattform und Genre-Preset, stelle die Mastering-Intensität ein und klicke auf Mastern. Die KI analysiert dein Audio, wählt automatisch die optimalen Parameter und die 12-stufige DSP-Pipeline verarbeitet deinen Track professionell.",
      },
    },
    {
      "@type": "Question",
      name: "Wie lange dauert das Mastering?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Die Analyse dauert ca. 5–10 Sekunden. Das vollständige Mastering (DSP-Pipeline + alle Exportformate) dauert je nach Tracklänge 30 Sekunden bis 3 Minuten.",
      },
    },
    {
      "@type": "Question",
      name: "Werden meine Audiodateien gespeichert?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nein. Hochgeladene Original-Audiodateien werden sofort nach Abschluss der Verarbeitung vom Server gelöscht (max. 60 Minuten). Gemasterte Ausgabedateien werden je nach Tarif 2 Stunden (Standard) oder 24 Stunden (Studio) vorgehalten und dann automatisch gelöscht.",
      },
    },
    {
      "@type": "Question",
      name: "Wie lange habe ich Zeit zum Download?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free, Pay per Track, Creator, Pro und Pro+ haben ein 2-Stunden-Download-Fenster. Der Studio-Plan gibt dir 24 Stunden Zeit. Nach Ablauf werden alle Dateien automatisch gelöscht.",
      },
    },
    {
      "@type": "Question",
      name: "Welche Abos gibt es bei UpMaDo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free (€0, 3 Masters/Tag), Pay per Track (€2.99/Track), Creator (€7.99/Monat, 25 Masters, KI), Pro (€14.99/Monat, 100 Masters, Referenz-Track), Pro+ (€24.99/Monat, 250 Masters, WAV 32-bit), Studio (€49.99/Monat, Unbegrenzt, 24h Download).",
      },
    },
    {
      "@type": "Question",
      name: "What is LUFS and why does it matter?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "LUFS (Loudness Units Full Scale) is the standard loudness measurement for streaming platforms. Spotify normalises to –14 LUFS. UpMaDo automatically targets the correct LUFS value for your chosen platform so your track sounds optimal without being ducked.",
      },
    },
  ],
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
