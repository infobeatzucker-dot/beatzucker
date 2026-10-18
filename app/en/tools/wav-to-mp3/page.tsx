import { pageMetadata } from "@/lib/pageMetadata";
import AudioUtilityPage from "@/components/AudioUtilityPage";
export const metadata = pageMetadata({ title: { absolute: "WAV to MP3 Converter – Free Online Download | Beatzucker" }, description: "Convert WAV to MP3 at 128 or 320 kbit/s and download the full file. Free, no sign-in; up to 80 MB and 10 minutes.", alternates: { canonical: "https://beatzucker.de/en/tools/wav-to-mp3", languages: { "de-DE": "https://beatzucker.de/tools/wav-to-mp3", en: "https://beatzucker.de/en/tools/wav-to-mp3", "x-default": "https://beatzucker.de/tools/wav-to-mp3" } } });
export default function Page() { return <AudioUtilityPage lang="en" tool="wav-to-mp3"/>; }

