import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Vocal Remover: separate vocals and instrumental", description: "Separate vocals and instrumental online. Short trial after sign-in; full stems after activation. Availability depends on the separation worker.", alternates: { canonical: "https://beatzucker.de/en/tools/vocal-remover", languages: { "de-DE": "https://beatzucker.de/tools/vocal-remover", en: "https://beatzucker.de/en/tools/vocal-remover", "x-default": "https://beatzucker.de/tools/vocal-remover" } } });
export default function Page() { return <StemToolPage lang="en" tool="vocal-remover"/>; }
