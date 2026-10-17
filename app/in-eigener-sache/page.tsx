import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import SupportProject from "@/components/SupportProject";
export const metadata: Metadata = pageMetadata({
  title: "In eigener Sache – Beatzucker unterstützen",
  description: "Beatzucker soll kostenlos bleiben. Erfahre, wie freiwillige Spenden den Serverbetrieb, die Weiterentwicklung und mehr kostenlose Mastering-Kapazität unterstützen.",
  alternates: { canonical: "https://beatzucker.de/in-eigener-sache", languages: { "de-DE": "https://beatzucker.de/in-eigener-sache", en: "https://beatzucker.de/en/support", "x-default": "https://beatzucker.de/in-eigener-sache" } },
});
export default function SupportPage() { return <SupportProject lang="de" />; }
