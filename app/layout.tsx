import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./compare.css";
import "./ui-theme.css";
import { uiThemeBootstrap } from "@/lib/uiTheme";
import CookieBanner from "@/components/CookieBanner";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://beatzucker.de";

// The App Router has one shared root layout for both language trees. Set the
// document language before the body is parsed so English routes are announced
// correctly without waiting for React hydration.
const documentLanguageScript = `(()=>{const p=location.pathname;const en=/^\\/en(?:\\/|$)/.test(p)||["/privacy","/terms","/legal-notice","/cancellation-policy"].includes(p);document.documentElement.lang=en?"en":"de"})()`;

export const metadata: Metadata = pageMetadata({
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Online Mastering kostenlos – mit Live-Feinabstimmung | Beatzucker",
    template: "%s | Beatzucker",
  },
  description:
    "Online Mastering kostenlos: Song automatisch mastern, live feinabstimmen und als WAV oder MP3 herunterladen. Ohne Abo, mit Anmeldung und Tageskontingent.",
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
    google: "a_r7RjFlKS1_W8u8PhyfcGPaTN4PC9rmIiMuq3vELAc",
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
    title: "Online Mastering kostenlos – mit Live-Feinabstimmung | Beatzucker",
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
});

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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: uiThemeBootstrap }} />
        <script dangerouslySetInnerHTML={{ __html: documentLanguageScript }} />
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
