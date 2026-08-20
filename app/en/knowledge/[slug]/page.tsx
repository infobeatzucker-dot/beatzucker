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
import { HeroIcon } from "@/lib/heroIcons";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  const deUrl = `https://beatzucker.de/ressourcen/${article.slug}`;
  const enUrl = `https://beatzucker.de/en/knowledge/${article.slug}`;
  return {
    title: { absolute: article.metaTitle.en },
    description: article.metaDescription.en,
    keywords: article.keywords.en,
    alternates: {
      canonical: enUrl,
      languages: { "de-DE": deUrl, en: enUrl, "x-default": deUrl },
    },
    openGraph: {
      type: "article",
      title: article.metaTitle.en,
      description: article.metaDescription.en,
      url: enUrl,
      locale: "en_US",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: article.title.en }],
    },
  };
}

const categoryColors: Record<string, string> = {
  Grundlagen: "var(--accent-purple)", Technik: "var(--accent-cyan)",
  Tipps: "var(--accent-gold)", Plattformen: "var(--accent-cyan)",
};
const categoryNames: Record<string, string> = {
  Grundlagen: "Basics", Technik: "Technology", Tipps: "Tips", Plattformen: "Platforms",
};

export default async function EnglishArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const related = getRelatedArticles(article.relatedSlugs);
  const url = `https://beatzucker.de/en/knowledge/${article.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org", "@type": "Article", "@id": `${url}#article`,
    headline: article.title.en, description: article.metaDescription.en,
    image: ["https://beatzucker.de/opengraph-image"],
    author: { "@type": "Organization", "@id": "https://beatzucker.de/#organization", name: "Beatzucker" },
    publisher: { "@id": "https://beatzucker.de/#organization" },
    datePublished: article.publishedAt, dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: "en", mainEntityOfPage: { "@type": "WebPage", "@id": url },
    isPartOf: { "@id": "https://beatzucker.de/#website" },
  };
  const color = categoryColors[article.category] ?? "var(--accent-purple)";
  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <Header lang="en" />
      <main style={{ paddingTop: "80px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
          <Breadcrumb article={article} lang="en" />
          <header style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <span className="label" style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.65rem", letterSpacing: "0.08em" }}>
                {categoryNames[article.category] ?? article.category}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{article.readingTimeMinutes} min read</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{publishedDate}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
              <span style={{ display: "flex", paddingTop: "0.3rem" }}><HeroIcon name={article.heroIcon} size={38} strokeWidth={1.6} color={color} /></span>
              <h1 style={{ color: "var(--text-primary)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 900, lineHeight: 1.2, margin: 0, letterSpacing: "-0.02em" }}>{article.title.en}</h1>
            </div>
          </header>
          <ArticleBody article={article} initialLang="en" />
          <ArticleCTA lang="en" variant={article.slug === "hitverdaechtiger-song" ? "hero" : "default"} />
          <RelatedArticles articles={related} lang="en" />
        </div>
      </main>
      <Footer lang="en" />
      <ScrollToTop lang="en" />
    </div>
  );
}
