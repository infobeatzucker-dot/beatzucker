import { pageMetadata } from "@/lib/pageMetadata";
import MasteringExamplesPage from "@/components/MasteringExamplesPage";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: { absolute: "Mastering Before and After: Real Audio Examples | Beatzucker" },
  description: "Compare original mixes with Beatzucker masters: real audio excerpts, optional loudness matching and measured LUFS/true-peak values. Listen without an account.",
  alternates: { canonical: "https://beatzucker.de/en/mastering-examples", languages: { "de-DE": "https://beatzucker.de/hoervergleich", en: "https://beatzucker.de/en/mastering-examples", "x-default": "https://beatzucker.de/hoervergleich" } },
});
export default function Page() { return <MasteringExamplesPage lang="en"/>; }
