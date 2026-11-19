import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Online Stem Splitter – Vocals, Drums, Bass and Instruments", description: "Hear four separated stems in a demo mixer with solo, mute and faders. Try the demo without an account. Full WAV stems require activation.", alternates: { canonical: "https://beatzucker.de/en/tools/stem-separation", languages: { "de-DE": "https://beatzucker.de/tools/stem-separation", en: "https://beatzucker.de/en/tools/stem-separation", "x-default": "https://beatzucker.de/tools/stem-separation" } } });
export default function Page() { return <StemToolPage lang="en" tool="stem-separation"/>; }
