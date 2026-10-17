import type { Lang } from "@/lib/types/mastering";

/** App details belong to the mastering landing page, not every legal/article page. */
export default function MasteringJsonLd({ lang }: { lang: Lang }) {
  const en = lang === "en", base = "https://beatzucker.de";
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${base}${en ? "/en" : ""}#app`,
    name: "Beatzucker Audio Mastering",
    url: `${base}${en ? "/en" : ""}`,
    inLanguage: en ? "en" : "de-DE",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any modern web browser",
    isAccessibleForFree: true,
    description: en
      ? "Automatic audio mastering with optional manual fine-tuning, live preview and a new full-track export. Free with a daily account allowance."
      : "Automatisches Audio-Mastering mit optionaler manueller Feinabstimmung, Live-Vorschau und neuem Gesamttrack-Export. Kostenlos mit Tageskontingent pro Konto.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@id": `${base}/#organization` },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
