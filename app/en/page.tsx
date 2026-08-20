import type { Metadata } from "next";
import Home from "../page";

const BASE_URL = "https://beatzucker.de";

export const metadata: Metadata = {
  title: { absolute: "Beatzucker – Professional Online Audio Mastering" },
  description:
    "Master your track online in minutes. Adaptive 12-stage DSP chain, real-time manual fine-tuning and 7 export formats — free to start.",
  alternates: {
    canonical: `${BASE_URL}/en`,
    languages: {
      "de-DE": BASE_URL,
      en: `${BASE_URL}/en`,
      "x-default": BASE_URL,
    },
  },
  openGraph: {
    type: "website",
    url: `${BASE_URL}/en`,
    siteName: "Beatzucker",
    title: "Beatzucker – Professional Online Audio Mastering",
    description:
      "Master your track online in minutes with adaptive DSP, real-time fine-tuning and 7 export formats.",
    locale: "en_US",
    alternateLocale: ["de_DE"],
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Beatzucker online audio mastering" }],
  },
};

export default function EnglishHomePage() {
  return <Home initialLang="en" />;
}
