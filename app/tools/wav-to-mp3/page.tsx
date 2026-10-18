import { pageMetadata } from "@/lib/pageMetadata";
import AudioUtilityPage from "@/components/AudioUtilityPage";
export const metadata = pageMetadata({ title: { absolute: "WAV zu MP3 konvertieren – kostenlos online | Beatzucker" }, description: "WAV kostenlos in MP3 mit 128 oder 320 kbit/s umwandeln und vollständig herunterladen. Ohne Anmeldung, bis 80 MB und 10 Minuten.", alternates: { canonical: "https://beatzucker.de/tools/wav-to-mp3", languages: { "de-DE": "https://beatzucker.de/tools/wav-to-mp3", en: "https://beatzucker.de/en/tools/wav-to-mp3", "x-default": "https://beatzucker.de/tools/wav-to-mp3" } } });
export default function Page() { return <AudioUtilityPage lang="de" tool="wav-to-mp3"/>; }

