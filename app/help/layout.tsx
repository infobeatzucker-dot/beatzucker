import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe & FAQ – Audio Mastering Support",
  description:
    "Antworten auf alle Fragen zu Beatzucker: Quickstart, Mastering-Pipeline, A/B-Player, Plattform-Presets, Funktionen, Tastaturkürzel und technische Details.",
  alternates: {
    canonical: "https://beatzucker.de/help",
  },
  openGraph: {
    title: "Beatzucker Hilfe & FAQ",
    description:
      "Frequently asked questions about Beatzucker audio mastering. Quickstart guide, platform presets, features, keyboard shortcuts and more.",
    url: "https://beatzucker.de/help",
  },
};

/* ── FAQ JSON-LD for Google Rich Results ──────────────────────────────────── */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Wie funktioniert Beatzucker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lade eine WAV- oder MP3-Datei hoch, wähle Zielplattform und Genre-Preset, stelle die Mastering-Intensität ein und klicke auf Mastern. Die KI analysiert dein Audio, wählt automatisch die optimalen Parameter und die 13-stufige DSP-Pipeline verarbeitet deinen Track professionell.",
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
        text: "Nein. Hochgeladene Original-Audiodateien werden sofort nach Abschluss der Verarbeitung vom Server gelöscht (max. 60 Minuten). Gemasterte Ausgabedateien werden 24 Stunden vorgehalten und dann automatisch gelöscht.",
      },
    },
    {
      "@type": "Question",
      name: "Wie lange habe ich Zeit zum Download?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Jeder Account hat ein einheitliches 24-Stunden-Download-Fenster nach Fertigstellung des Masters. Nach Ablauf werden alle Dateien automatisch gelöscht.",
      },
    },
    {
      "@type": "Question",
      name: "Ist Beatzucker wirklich kostenlos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Alle Funktionen — Auto AI, Referenz-Track-Mastering, alle Export-Formate inkl. WAV 32-bit — sind kostenlos und ohne Abo nutzbar. Ein faires Tageslimit von 10 Masters pro Account schützt lediglich vor Serverüberlastung.",
      },
    },
    {
      "@type": "Question",
      name: "What is LUFS and why does it matter?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "LUFS (Loudness Units Full Scale) is the standard loudness measurement for streaming platforms. Spotify normalises to –14 LUFS. Beatzucker automatically targets the correct LUFS value for your chosen platform so your track sounds optimal without being ducked.",
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
