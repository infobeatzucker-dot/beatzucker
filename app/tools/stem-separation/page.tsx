import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Stem Splitter online – Songs in vier Spuren trennen", description: "Höre Gesang, Drums, Bass und weitere Instrumente im Demo-Mischpult ohne Anmeldung. Vollständige WAV-Stems gibt es nach Freischaltung.", alternates: { canonical: "https://beatzucker.de/tools/stem-separation", languages: { "de-DE": "https://beatzucker.de/tools/stem-separation", en: "https://beatzucker.de/en/tools/stem-separation", "x-default": "https://beatzucker.de/tools/stem-separation" } } });
export default function Page() { return <StemToolPage lang="de" tool="stem-separation"/>; }
