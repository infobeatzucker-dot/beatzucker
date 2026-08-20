import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import PublicMixCheck from "@/components/PublicMixCheck";

export const metadata: Metadata = {
  title: { absolute: "Kostenloser Mix-Check – Ist dein Track bereit fürs Mastering? | Beatzucker" },
  description: "Prüfe deinen Mix kostenlos auf Headroom, Clipping, Dynamik, True Peak, Mono-Kompatibilität und technische Audiodaten – ohne Konto und ohne Mastering." ,
  alternates: {
    canonical: "https://beatzucker.de/mix-check",
    languages: { "de-DE": "https://beatzucker.de/mix-check", en: "https://beatzucker.de/en/mix-check", "x-default": "https://beatzucker.de/mix-check" },
  },
  openGraph: {
    type: "website", title: "Kostenloser Mix-Check | Beatzucker",
    description: "Headroom, Clipping, Dynamik und Mono-Kompatibilität deines Mixes kostenlos prüfen.",
    url: "https://beatzucker.de/mix-check", locale: "de_DE",
  },
};

export default function MixCheckPage() {
  return <div className="mixcheck-page"><BreadcrumbJsonLd name="Mix-Check" url="https://beatzucker.de/mix-check" /><Header lang="de" /><main><PublicMixCheck lang="de" /></main><Footer lang="de" /><ScrollToTop lang="de" /></div>;
}
