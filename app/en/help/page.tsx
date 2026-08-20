import type { Metadata } from "next";
import HelpPage from "@/app/help/page";

export const metadata: Metadata = {
  title: { absolute: "Help & FAQ – Audio Mastering Support | Beatzucker" },
  description:
    "Answers about Beatzucker's workflow, DSP chain, A/B player, platform presets, manual fine-tuning, downloads and audio-file privacy.",
  alternates: {
    canonical: "https://beatzucker.de/en/help",
    languages: {
      "de-DE": "https://beatzucker.de/help",
      en: "https://beatzucker.de/en/help",
      "x-default": "https://beatzucker.de/help",
    },
  },
  openGraph: {
    type: "website",
    title: "Beatzucker Help & FAQ",
    description: "Quickstart, mastering workflow, platform presets, manual fine-tuning, downloads and privacy.",
    url: "https://beatzucker.de/en/help",
    locale: "en_US",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does Beatzucker work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Upload an audio file, choose a platform target and genre preset, set the mastering intensity, and start mastering. Beatzucker analyzes the track and processes it through an adaptive 12-stage DSP chain.",
      },
    },
    {
      "@type": "Question",
      name: "Can I fine-tune the master manually?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. After automatic mastering, the manual mode provides a near-real-time preview, A/B comparison, waveform region playback and a final server render using your adjustments.",
      },
    },
    {
      "@type": "Question",
      name: "How long are my files available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Uploaded originals are removed after processing or within 60 minutes. Finished masters remain available for download for 24 hours and are then deleted automatically.",
      },
    },
  ],
};

export default function EnglishHelpPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <HelpPage initialLang="en" />
    </>
  );
}
