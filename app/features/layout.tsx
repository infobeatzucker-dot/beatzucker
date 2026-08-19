import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features – Professionelles adaptives Audio-Mastering",
  description:
    "12-stufige DSP-Pipeline, adaptive Parameterauswahl, A/B-Vergleichsplayer, 7 Exportformate und Echtzeit-Visualizer. Alle Features von Beatzucker im Überblick.",
  alternates: {
    canonical: "https://beatzucker.de/features",
  },
  openGraph: {
    title: "Beatzucker Features – Adaptive Audio Mastering",
    description:
      "12-stage DSP pipeline, adaptive parameter selection, A/B comparison player, 7 export formats. Professional mastering for every platform.",
    url: "https://beatzucker.de/features",
  },
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
