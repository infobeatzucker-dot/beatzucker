import type { Metadata } from "next";
import StudioBeta from "@/components/StudioBeta";

export const metadata: Metadata = {
  title: "Studio Mode",
  description: "Master your track in the new Beatzucker studio console.",
  alternates: { canonical: "/en/studio-beta", languages: { de: "/studio-beta", en: "/en/studio-beta" } },
  robots: { index: false, follow: true },
};

export default function EnglishStudioBetaPage() {
  return <StudioBeta lang="en" />;
}
