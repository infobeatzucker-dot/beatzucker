import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Features – Professionelles adaptives Audio-Mastering",
  description:
    "So funktioniert Beatzucker: automatisches Online-Mastering, Studio Mode mit Live-Spektrum, A/B-Vergleich, manueller Feinabstimmung und Export.",
  alternates: {
    canonical: "https://beatzucker.de/features",
    languages: {
      "de-DE": "https://beatzucker.de/features",
      en: "https://beatzucker.de/en/features",
      "x-default": "https://beatzucker.de/features",
    },
  },
  openGraph: {
    title: "Beatzucker Features – Adaptive Audio Mastering",
    description:
      "12-stage DSP pipeline, adaptive parameter selection, A/B comparison player, 7 export formats. Professional mastering for every platform.",
    url: "https://beatzucker.de/features",
  },
});

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
