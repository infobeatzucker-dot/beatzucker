import { pageMetadata } from "@/lib/pageMetadata";
import StemToolPage from "@/components/StemToolPage";
export const metadata = pageMetadata({ title: "Vocal Remover online – Gesang und Instrumental trennen", description: "Höre getrennte Gesangs- und Instrumentalspuren im Demo-Mischpult ohne Anmeldung. Teste danach deinen eigenen Song nach Anmeldung.", alternates: { canonical: "https://beatzucker.de/tools/vocal-remover", languages: { "de-DE": "https://beatzucker.de/tools/vocal-remover", en: "https://beatzucker.de/en/tools/vocal-remover", "x-default": "https://beatzucker.de/tools/vocal-remover" } } });
export default function Page() { return <StemToolPage lang="de" tool="vocal-remover"/>; }
