import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import ReleaseHistory from "@/components/ReleaseHistory";

export const metadata: Metadata = pageMetadata({
  title: "Versionshistorie – Was ist neu?",
  description: "Alle neuen Beatzucker-Updates verständlich erklärt: Verbesserungen beim Mastering, bei Audio-Tools und bei der Bedienung.",
  alternates: { canonical: "https://beatzucker.de/versionen", languages: { "de-DE": "https://beatzucker.de/versionen", en: "https://beatzucker.de/en/updates", "x-default": "https://beatzucker.de/versionen" } },
});

export default function VersionsPage() { return <ReleaseHistory lang="de" />; }
