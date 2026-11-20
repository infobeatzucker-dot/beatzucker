import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Hilfe & FAQ – Audio Mastering Support",
  description:
    "Hilfe zu Beatzucker und Studio Mode: Upload, Mastering-Fortschritt, A/B-Vergleich, manuelle Feinabstimmung und Downloads.",
  alternates: {
    canonical: "https://beatzucker.de/help",
    languages: {
      "de-DE": "https://beatzucker.de/help",
      en: "https://beatzucker.de/en/help",
      "x-default": "https://beatzucker.de/help",
    },
  },
  openGraph: {
    title: "Beatzucker Hilfe & FAQ",
    description:
      "Antworten zum Beatzucker-Mastering und Studio Mode. Vom Upload über das Fortschrittsfenster bis zur Feinabstimmung und zum Download.",
    url: "https://beatzucker.de/help",
  },
});

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
        text: "Lade eine WAV- oder MP3-Datei hoch, wähle Zielplattform und Genre-Preset, stelle die Mastering-Intensität ein und klicke auf Mastern. Die Engine analysiert dein Audio, leitet passende Parameter ab und verarbeitet den Track in einer 12-stufigen DSP-Pipeline.",
      },
    },
    {
      "@type": "Question",
      name: "Wie lange dauert das Mastering?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Die Dauer hängt von Tracklänge, Samplerate, dem gewählten Exportformat und der Serverauslastung ab. Gerendert werden das gewählte Format und eine MP3-Vorschau.",
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
