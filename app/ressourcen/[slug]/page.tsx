import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import Breadcrumb from "@/components/ressourcen/Breadcrumb";
import ArticleBody from "@/components/ressourcen/ArticleBody";
import ArticleCTA from "@/components/ressourcen/ArticleCTA";
import RelatedArticles from "@/components/ressourcen/RelatedArticles";
import { ARTICLES, getArticleBySlug, getRelatedArticles } from "@/app/data/ressourcen";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.metaTitle.de,
    description: article.metaDescription.de,
    keywords: article.keywords.de,
    alternates: { canonical: `https://upmado.com/ressourcen/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.metaTitle.de,
      description: article.metaDescription.de,
      url: `https://upmado.com/ressourcen/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
    },
  };
}

const categoryColors: Record<string, string> = {
  Grundlagen:  "var(--accent-purple)",
  Technik:     "var(--accent-cyan)",
  Tipps:       "var(--accent-gold)",
  Plattformen: "var(--accent-cyan)",
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(article.relatedSlugs);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `https://upmado.com/ressourcen/${article.slug}#article`,
    headline: article.title.de,
    description: article.metaDescription.de,
    author: {
      "@type": "Organization",
      "@id": "https://upmado.com/#organization",
      name: "UpMaDo",
    },
    publisher: { "@id": "https://upmado.com/#organization" },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: "de-DE",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://upmado.com/ressourcen/${article.slug}`,
    },
    isPartOf: { "@id": "https://upmado.com/#website" },
  };

  const catColor = categoryColors[article.category] ?? "var(--accent-purple)";

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("de-DE", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Header />

      <main style={{ paddingTop: "80px" }}>
        <div
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            padding: "3rem 1.5rem 5rem",
          }}
        >
          {/* Breadcrumb (server-rendered, uses default lang "de") */}
          <Breadcrumb article={article} lang="de" />

          {/* Article header */}
          <header style={{ marginBottom: "2.5rem" }}>
            {/* Category + reading time */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <span
                className="label"
                style={{
                  color: catColor,
                  background: `color-mix(in srgb, ${catColor} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${catColor} 30%, transparent)`,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "20px",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                }}
              >
                {article.category}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {article.readingTimeMinutes} Min. Lesezeit
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {publishedDate}
              </span>
            </div>

            {/* Emoji + title */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "2.5rem", lineHeight: 1.2 }}>{article.heroEmoji}</span>
              <h1
                style={{
                  color: "var(--text-primary)",
                  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                  fontWeight: 900,
                  lineHeight: 1.2,
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {article.title.de}
              </h1>
            </div>
          </header>

          {/* Article body (client component with DE/EN toggle) */}
          <ArticleBody article={article} />

          {/* CTA */}
          <ArticleCTA lang="de" variant={article.slug === "hitverdaechtiger-song" ? "hero" : "default"} />

          {/* Related articles */}
          <RelatedArticles articles={related} lang="de" />
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
