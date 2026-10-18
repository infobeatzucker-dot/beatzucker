import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Vocal Remover: Stimme und Instrumental trennen", description: "Gesang und Instrumental online trennen. Kurze Testvorschau nach Anmeldung; vollständige Spuren nach Freischaltung. Verfügbarkeit abhängig vom Trennungsdienst.", alternates: { canonical: "https://beatzucker.de/tools/vocal-remover", languages: { "de-DE": "https://beatzucker.de/tools/vocal-remover", en: "https://beatzucker.de/en/tools/vocal-remover", "x-default": "https://beatzucker.de/tools/vocal-remover" } } });
export default function Page() { return <StemToolPage lang="de" tool="vocal-remover"/>; }
