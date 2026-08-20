import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ArticleGrid from "@/components/ressourcen/ArticleGrid";
import { ARTICLES } from "@/app/data/ressourcen";

export const metadata: Metadata = {
  title: { absolute: "Audio Mastering Wissen – Guides, Tipps & Technik | Beatzucker" },
  description:
    "Alles über Audio Mastering: LUFS erklärt, Mastering vs. Mixing, KI-Mastering, Plattform-Lautstärken, Home-Recording-Fehler und mehr. Kostenlose Guides für Produzenten.",
  keywords: [
    "audio mastering wissen",
    "mastering guides",
    "lufs erklärt",
    "mastering tipps",
    "ki mastering",
    "home recording",
  ],
  alternates: {
    canonical: "https://beatzucker.de/ressourcen",
    languages: {
      "de-DE": "https://beatzucker.de/ressourcen",
      en: "https://beatzucker.de/en/knowledge",
      "x-default": "https://beatzucker.de/ressourcen",
    },
  },
  openGraph: {
    type: "website",
    title: "Audio Mastering Wissen – Guides & Tipps",
    description: "Kostenlose Mastering-Guides, LUFS-Erklärungen, Plattform-Zielwerte und mehr.",
    url: "https://beatzucker.de/ressourcen",
  },
};

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://beatzucker.de/ressourcen",
  name: "Audio Mastering Wissen",
  description:
    "Guides, Tipps und technische Hintergründe zum Thema Audio Mastering für Independent-Produzenten.",
  url: "https://beatzucker.de/ressourcen",
  inLanguage: ["de-DE", "en"],
  isPartOf: { "@id": "https://beatzucker.de/#website" },
};

export default function RessourcenPage() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <Header />

      <main style={{ paddingTop: "80px" }}>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            padding: "4rem 1.5rem 2.5rem",
            textAlign: "center",
          }}
        >
          <span
            className="label"
            style={{
              display: "inline-block",
              color: "var(--accent-purple)",
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)",
              padding: "0.3rem 0.9rem",
              borderRadius: "20px",
              fontSize: "0.68rem",
              letterSpacing: "0.12em",
              marginBottom: "1.25rem",
            }}
          >
            WISSEN · KNOWLEDGE
          </span>

          <h1
            style={{
              color: "var(--text-primary)",
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 900,
              lineHeight: 1.15,
              margin: "0 0 1rem",
              letterSpacing: "-0.02em",
            }}
          >
            Audio Mastering{" "}
            <span
              style={{
                background: "linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Wissen
            </span>
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1.05rem",
              lineHeight: 1.65,
              maxWidth: "580px",
              margin: "0 auto 0.75rem",
            }}
          >
            Guides, Technik-Erklärungen und praktische Tipps — alles, was du über professionelles Audio Mastering wissen musst.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
            }}
          >
            {ARTICLES.length} Artikel · Deutsch & English
          </p>
        </section>

        {/* ── Grid ──────────────────────────────────────────────── */}
        <section
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            padding: "0 1.5rem 5rem",
          }}
        >
          <ArticleGrid articles={ARTICLES} />
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
