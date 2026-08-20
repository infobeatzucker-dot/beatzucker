import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./compare.css";
import CookieBanner from "@/components/CookieBanner";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://beatzucker.de";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Beatzucker – Professionelles Online Audio Mastering",
    template: "%s | Beatzucker",
  },
  description:
    "Mastere deinen Track online in wenigen Minuten. Adaptive 12-stufige DSP-Kette, manuelle Live-Feinabstimmung und 7 Exportformate – kostenlos starten.",
  keywords: [
    "audio mastering",
    "AI mastering",
    "online mastering",
    "automatic mastering",
    "music production",
    "mastering service",
    "LUFS normalization",
    "Mastering online",
    "Musik mastern",
    "automatisches Mastering",
  ],
  authors: [{ name: "Beatzucker", url: BASE_URL }],
  creator: "Beatzucker",
  publisher: "Beatzucker",

  verification: {
    google: "cdAqmUQF4JgCkEgRVswUrhbeX_hXR2Ed70bbN7W4WWU",
  },

  alternates: {
    canonical: BASE_URL,
    languages: {
      "de-DE": BASE_URL,
      "en": `${BASE_URL}/en`,
      "x-default": BASE_URL,
    },
  },

  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Beatzucker",
    title: "Beatzucker – Professionelles Online Audio Mastering",
    description:
      "Mastere deinen Track online in wenigen Minuten – mit adaptiver DSP-Kette, Live-Feinabstimmung und 7 Exportformaten.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Beatzucker – professionelles Online Audio Mastering",
      },
    ],
    locale: "de_DE",
  },

  twitter: {
    card: "summary_large_image",
    title: "Beatzucker – Professionelles Online Mastering",
    description:
      "Adaptives Audio Mastering mit Live-Feinabstimmung und 7 Exportformaten. Kostenlos starten.",
    images: ["/opengraph-image"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/* ── JSON-LD Structured Data ──────────────────────────────────────────────── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Beatzucker",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/favicon.ico`,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "info@re-beatz.com",
        contactType: "customer support",
        availableLanguage: ["German", "English"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "Beatzucker",
      description: "Adaptive Professional Audio Mastering",
      publisher: { "@id": `${BASE_URL}/#organization` },
      inLanguage: ["de-DE", "en-US"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#app`,
      name: "Beatzucker Audio Mastering",
      applicationCategory: "MusicApplication",
      applicationSubCategory: "Audio Mastering",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "Professional automated audio mastering service. 12-stage DSP signal chain, adaptive parameter selection, 7 export formats, 11 platform targets.",
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "EUR",
          description: "Full DSP mastering pipeline, adaptive parameter selection, reference track matching, 7 selectable export formats, 24h download window — completely free, fair daily usage limit per account",
        },
      ],
      featureList: [
        "12-stage DSP mastering pipeline",
        "Adaptive parameter selection",
        "7 export formats (WAV 32/24/16, FLAC, MP3 320/128, AAC 256)",
        "11 platform targets (Spotify, Apple Music, YouTube, Club, …)",
        "Real-time A/B comparison player",
        "Spectrum analyzer, LUFS meter, stereo field visualizer",
        "Reference track matching",
        "LUFS normalization, oversampled True Peak limiting",
        "De-essing, noise-shaped dithering",
      ],
      screenshot: `${BASE_URL}/opengraph-image`,
      publisher: { "@id": `${BASE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased noise-bg">
        <Providers>
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
