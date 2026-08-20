import Link from "next/link";
import type { RessourceArticle } from "@/app/data/ressourcen";

type Lang = "de" | "en";

interface Props {
  article?: RessourceArticle;
  lang?: Lang;
}

export default function Breadcrumb({ article, lang = "de" }: Props) {
  const homeLabel  = "Beatzucker";
  const wissenLabel = lang === "de" ? "Wissen" : "Knowledge";
  const homeUrl = lang === "en" ? "https://beatzucker.de/en" : "https://beatzucker.de";
  const knowledgeUrl = lang === "en" ? "https://beatzucker.de/en/knowledge" : "https://beatzucker.de/ressourcen";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: homeLabel, item: homeUrl },
      { "@type": "ListItem", position: 2, name: wissenLabel, item: knowledgeUrl },
      ...(article
        ? [{ "@type": "ListItem", position: 3, name: article.title[lang], item: `${knowledgeUrl}/${article.slug}` }]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <Link href={lang === "en" ? "/en" : "/"} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {homeLabel}
        </Link>
        <span>›</span>
        <Link href={lang === "en" ? "/en/knowledge" : "/ressourcen"} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {wissenLabel}
        </Link>
        {article && (
          <>
            <span>›</span>
            <span style={{ color: "var(--text-secondary)" }}>{article.title[lang]}</span>
          </>
        )}
      </nav>
    </>
  );
}
