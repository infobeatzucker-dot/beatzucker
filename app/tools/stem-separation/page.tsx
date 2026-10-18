import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Stem Separation: Vocals, Drums, Bass und Instrumente", description: "Songs in vier Spuren zerlegen. Kurze Testvorschau nach Anmeldung; vollständige WAV-Spuren nach Freischaltung. Verfügbarkeit abhängig vom Trennungsdienst.", alternates: { canonical: "https://beatzucker.de/tools/stem-separation", languages: { "de-DE": "https://beatzucker.de/tools/stem-separation", en: "https://beatzucker.de/en/tools/stem-separation", "x-default": "https://beatzucker.de/tools/stem-separation" } } });
export default function Page() { return <StemToolPage lang="de" tool="stem-separation"/>; }
