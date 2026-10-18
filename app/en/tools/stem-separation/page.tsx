import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Stem Separation: vocals, drums, bass and instruments", description: "Split songs into four stems. Short trial after sign-in; full WAV stems after activation. Availability depends on the separation worker.", alternates: { canonical: "https://beatzucker.de/en/tools/stem-separation", languages: { "de-DE": "https://beatzucker.de/tools/stem-separation", en: "https://beatzucker.de/en/tools/stem-separation", "x-default": "https://beatzucker.de/tools/stem-separation" } } });
export default function Page() { return <StemToolPage lang="en" tool="stem-separation"/>; }
