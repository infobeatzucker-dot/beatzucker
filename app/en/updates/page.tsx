import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import ReleaseHistory from "@/components/ReleaseHistory";

export const metadata: Metadata = pageMetadata({
  title: "What's new – Update history",
  description: "Beatzucker updates explained in plain language: improvements to mastering, audio tools and everyday use.",
  alternates: { canonical: "https://beatzucker.de/en/updates", languages: { "de-DE": "https://beatzucker.de/versionen", en: "https://beatzucker.de/en/updates", "x-default": "https://beatzucker.de/versionen" } },
});

export default function UpdatesPage() { return <ReleaseHistory lang="en" />; }
