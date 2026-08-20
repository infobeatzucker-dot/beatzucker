import type { Metadata } from "next";
import FeaturesPage from "@/app/features/page";

export const metadata: Metadata = {
  title: { absolute: "Features – Professional Adaptive Audio Mastering | Beatzucker" },
  description:
    "Explore Beatzucker's adaptive 12-stage DSP pipeline, real-time manual fine-tuning, A/B player, visual analysis and 7 delivery formats.",
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
};

export default function EnglishFeaturesPage() {
  return <FeaturesPage initialLang="en" />;
}
