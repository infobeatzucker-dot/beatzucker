import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ArticleGrid from "@/components/ressourcen/ArticleGrid";
import { ARTICLES } from "@/app/data/ressourcen";

export const metadata: Metadata = {
  title: { absolute: "Audio Mastering Knowledge – Guides, Tips & Technology | Beatzucker" },
  description:
    "Learn audio mastering: LUFS, mastering vs mixing, adaptive mastering, platform loudness targets, home-recording mistakes and practical release advice.",
  alternates: {
    canonical: "https://beatzucker.de/en/knowledge",
    languages: {
      "de-DE": "https://beatzucker.de/ressourcen",
      en: "https://beatzucker.de/en/knowledge",
      "x-default": "https://beatzucker.de/ressourcen",
    },
  },
  openGraph: {
    type: "website",
    title: "Audio Mastering Knowledge – Guides & Tips",
    description: "Free mastering guides, LUFS explanations, platform targets and practical production advice.",
    url: "https://beatzucker.de/en/knowledge",
    locale: "en_US",
  },
};

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://beatzucker.de/en/knowledge",
  name: "Audio Mastering Knowledge",
  description: "Guides, practical advice and technical background about audio mastering for independent producers.",
  url: "https://beatzucker.de/en/knowledge",
  inLanguage: "en",
  isPartOf: { "@id": "https://beatzucker.de/#website" },
};

export default function EnglishKnowledgePage() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <Header lang="en" />
      <main style={{ paddingTop: "80px" }}>
        <section style={{ maxWidth: "72rem", margin: "0 auto", padding: "4rem 1.5rem 2.5rem", textAlign: "center" }}>
          <span className="label" style={{ display: "inline-block", color: "var(--accent-purple)", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", padding: "0.3rem 0.9rem", borderRadius: "20px", fontSize: "0.68rem", letterSpacing: "0.12em", marginBottom: "1.25rem" }}>
            KNOWLEDGE
          </span>
          <h1 style={{ color: "var(--text-primary)", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Audio Mastering <span style={{ background: "linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Knowledge</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.65, maxWidth: "620px", margin: "0 auto 0.75rem" }}>
            Practical guides, clear technical explanations and production advice for confident, release-ready masters.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{ARTICLES.length} articles · English</p>
        </section>
        <section style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.5rem 5rem" }}>
          <ArticleGrid articles={ARTICLES} initialLang="en" />
        </section>
      </main>
      <Footer lang="en" />
      <ScrollToTop lang="en" />
    </div>
  );
}
