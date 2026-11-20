import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import FeaturesPage from "@/app/features/page";

export const metadata: Metadata = pageMetadata({
  title: { absolute: "Features – Professional Adaptive Audio Mastering | Beatzucker" },
  description:
    "See how Beatzucker works: online mastering, Studio Mode with a live spectrum, A/B listening, manual fine-tuning and export.",
  alternates: {
    canonical: "https://beatzucker.de/en/features",
    languages: {
      "de-DE": "https://beatzucker.de/features",
      en: "https://beatzucker.de/en/features",
      "x-default": "https://beatzucker.de/features",
    },
  },
  openGraph: {
    type: "website",
    title: "Beatzucker Features – Adaptive Audio Mastering",
    description: "12-stage DSP, real-time fine-tuning, A/B comparison, visual analysis and 7 delivery formats.",
    url: "https://beatzucker.de/en/features",
    locale: "en_US",
  },
});

export default function EnglishFeaturesPage() {
  return <FeaturesPage initialLang="en" />;
}
