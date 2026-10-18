import { pageMetadata } from "@/lib/pageMetadata";
import AudioUtilityPage from "@/components/AudioUtilityPage";
export const metadata = pageMetadata({ title: { absolute: "Audio Cutter – Trim Audio Online, Download WAV | Beatzucker" }, description: "Trim audio online with waveform start/end markers, preview and optional fades. Free local processing, download 16/24-bit or float WAV.", alternates: { canonical: "https://beatzucker.de/en/tools/audio-cutter", languages: { "de-DE": "https://beatzucker.de/tools/audio-cutter", en: "https://beatzucker.de/en/tools/audio-cutter", "x-default": "https://beatzucker.de/tools/audio-cutter" } } });
export default function Page() { return <AudioUtilityPage lang="en" tool="audio-cutter"/>; }

