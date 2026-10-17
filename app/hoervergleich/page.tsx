import { pageMetadata } from "@/lib/pageMetadata";
import MasteringExamplesPage from "@/components/MasteringExamplesPage";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: { absolute: "Mastering Vorher–Nachher: Echte Hörbeispiele | Beatzucker" },
  description: "Original-Mix und Beatzucker-Master direkt vergleichen: echte Hörproben, optionaler Lautheitsabgleich und gemessene LUFS-/True-Peak-Werte. Ohne Anmeldung anhören.",
  alternates: { canonical: "https://beatzucker.de/hoervergleich", languages: { "de-DE": "https://beatzucker.de/hoervergleich", en: "https://beatzucker.de/en/mastering-examples", "x-default": "https://beatzucker.de/hoervergleich" } },
});
export default function Page() { return <MasteringExamplesPage lang="de"/>; }
