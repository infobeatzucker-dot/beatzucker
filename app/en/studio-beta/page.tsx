import type { Metadata } from "next";
import StudioBeta from "@/components/StudioBeta";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Studio Mode",
  description: "Try Beatzucker Studio Mode with a demo track, live spectrum and built-in mastering fine-tuning.",
  alternates: {
    canonical: "https://beatzucker.de/en/studio-beta",
    languages: { "de-DE": "https://beatzucker.de/studio-beta", en: "https://beatzucker.de/en/studio-beta", "x-default": "https://beatzucker.de/studio-beta" },
  },
  robots: { index: false, follow: true },
});

export default function EnglishStudioBetaPage() {
  return <StudioBeta lang="en" />;
}
