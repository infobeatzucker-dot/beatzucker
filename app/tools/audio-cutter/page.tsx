import { pageMetadata } from "@/lib/pageMetadata";
import AudioUtilityPage from "@/components/AudioUtilityPage";
export const metadata = pageMetadata({ title: { absolute: "Audio schneiden online – Audio-Cutter mit WAV-Download | Beatzucker" }, description: "Audio online schneiden: Start und Ende in der Wellenform setzen, vorhören und mit optionalen Fades als WAV herunterladen. Lokal und kostenlos.", alternates: { canonical: "https://beatzucker.de/tools/audio-cutter", languages: { "de-DE": "https://beatzucker.de/tools/audio-cutter", en: "https://beatzucker.de/en/tools/audio-cutter", "x-default": "https://beatzucker.de/tools/audio-cutter" } } });
export default function Page() { return <AudioUtilityPage lang="de" tool="audio-cutter"/>; }

