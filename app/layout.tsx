import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://upmado.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "UpMaDo – AI-Powered Professional Audio Mastering",
    template: "%s | UpMaDo",
  },
  description:
    "Upload your track. Get a professional master in seconds. 13-stage DSP pipeline, AI parameter selection, 7 export formats. Free to start.",
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
  authors: [{ name: "UpMaDo", url: BASE_URL }],
  creator: "UpMaDo",
  publisher: "UpMaDo",

  verification: {
    google: "cdAqmUQF4JgCkEgRVswUrhbeX_hXR2Ed70bbN7W4WWU",
  },

  alternates: {
    canonical: BASE_URL,
    languages: {
      "de-DE": BASE_URL,
      "en-US": BASE_URL,
    },
  },

  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "UpMaDo",
    title: "UpMaDo – AI-Powered Professional Audio Mastering",
    description:
      "Upload your track. Get a professional master in seconds. 13-stage DSP pipeline, AI parameter selection, 7 export formats. Free to start.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "UpMaDo – AI-Powered Professional Audio Mastering",
      },
    ],
    locale: "de_DE",
  },

  twitter: {
    card: "summary_large_image",
    title: "UpMaDo – AI Audio Mastering",
    description:
      "Professional audio mastering in seconds. 13-stage DSP + AI parameter selection. Free to start.",
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
      name: "UpMaDo",
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
      name: "UpMaDo",
      description: "AI-Powered Professional Audio Mastering",
      publisher: { "@id": `${BASE_URL}/#organization` },
      inLanguage: ["de-DE", "en-US"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#app`,
      name: "UpMaDo Audio Mastering",
      applicationCategory: "MusicApplication",
      applicationSubCategory: "Audio Mastering",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "Professional automated audio mastering service. 13-stage DSP signal chain, AI-assisted parameter selection, 7 export formats, 11 platform targets.",
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "EUR",
          description: "Full DSP mastering pipeline, AI-assisted parameter selection, reference track matching, all 7 export formats, 24h download window — completely free, fair daily usage limit per account",
        },
      ],
      featureList: [
        "13-stage DSP mastering pipeline",
        "AI-assisted parameter selection",
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
