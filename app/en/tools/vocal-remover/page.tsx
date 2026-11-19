import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Online Vocal Remover – Isolate Vocals and Instrumental", description: "Hear separated vocals and instrumental in an interactive demo mixer with no sign-in. Sign in to try the first 20 seconds of your own song.", alternates: { canonical: "https://beatzucker.de/en/tools/vocal-remover", languages: { "de-DE": "https://beatzucker.de/tools/vocal-remover", en: "https://beatzucker.de/en/tools/vocal-remover", "x-default": "https://beatzucker.de/tools/vocal-remover" } } });
export default function Page() { return <StemToolPage lang="en" tool="vocal-remover"/>; }
