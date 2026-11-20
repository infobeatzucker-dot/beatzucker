import type { Metadata } from "next";
import StudioBeta from "@/components/StudioBeta";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Studio Mode",
  description: "Probiere den Studio Mode von Beatzucker mit Demo-Track, Live-Spektrum und integrierter Mastering-Feinabstimmung aus.",
  alternates: {
    canonical: "https://beatzucker.de/studio-beta",
    languages: { "de-DE": "https://beatzucker.de/studio-beta", en: "https://beatzucker.de/en/studio-beta", "x-default": "https://beatzucker.de/studio-beta" },
  },
  robots: { index: false, follow: true },
});

export default function StudioBetaPage() {
  return <StudioBeta lang="de" />;
}
