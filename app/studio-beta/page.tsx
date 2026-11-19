import type { Metadata } from "next";
import StudioBeta from "@/components/StudioBeta";

export const metadata: Metadata = {
  title: "Studio Mode",
  description: "Mastere deinen Track in der neuen Beatzucker-Studiokonsole.",
  alternates: { canonical: "/studio-beta", languages: { de: "/studio-beta", en: "/en/studio-beta" } },
  robots: { index: false, follow: true },
};

export default function StudioBetaPage() {
  return <StudioBeta lang="de" />;
}
