import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features – Professionelles AI Audio Mastering",
  description:
    "13-stufige DSP-Pipeline, KI-Parameterauswahl, A/B-Vergleichsplayer, 7 Exportformate und Echtzeit-Visualizer. Alle Features von UpMaDo im Überblick.",
  alternates: {
    canonical: "https://upmado.com/features",
  },
  openGraph: {
    title: "UpMaDo Features – AI Audio Mastering",
    description:
      "13-stage DSP pipeline, AI parameter selection, A/B comparison player, 7 export formats. Professional mastering for every platform.",
    url: "https://upmado.com/features",
  },
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
