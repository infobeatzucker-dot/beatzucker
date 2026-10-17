import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import SupportProject from "@/components/SupportProject";
export const metadata: Metadata = pageMetadata({
  title: "A note from us – Support Beatzucker",
  description: "Help Beatzucker stay free. Learn how voluntary donations support server costs, development and more free mastering capacity.",
  alternates: { canonical: "https://beatzucker.de/en/support", languages: { "de-DE": "https://beatzucker.de/in-eigener-sache", en: "https://beatzucker.de/en/support", "x-default": "https://beatzucker.de/in-eigener-sache" } },
});
export default function SupportPage() { return <SupportProject lang="en" />; }
