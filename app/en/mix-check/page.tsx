import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import PublicMixCheck from "@/components/PublicMixCheck";

export const metadata: Metadata = {
  title: { absolute: "Free Mix Check – Is Your Track Ready for Mastering? | Beatzucker" },
  description: "Check your mix for headroom, clipping, dynamics, true peak, mono compatibility and technical audio data — free, without an account or mastering." ,
  alternates: {
    canonical: "https://beatzucker.de/en/mix-check",
    languages: { "de-DE": "https://beatzucker.de/mix-check", en: "https://beatzucker.de/en/mix-check", "x-default": "https://beatzucker.de/mix-check" },
  },
  openGraph: {
    type: "website", title: "Free Mix Check | Beatzucker",
    description: "Check headroom, clipping, dynamics and mono compatibility before mastering.",
    url: "https://beatzucker.de/en/mix-check", locale: "en_US",
  },
};

export default function EnglishMixCheckPage() {
  return <div className="mixcheck-page"><BreadcrumbJsonLd name="Mix Check" url="https://beatzucker.de/en/mix-check" /><Header lang="en" /><main><PublicMixCheck lang="en" /></main><Footer lang="en" /><ScrollToTop lang="en" /></div>;
}
