"use client";

import Link from "next/link";
import type { RessourceArticle } from "@/app/data/ressourcen";
import { HeroIcon } from "@/lib/heroIcons";

type Lang = "de" | "en";

const categoryLabels: Record<string, { de: string; en: string }> = {
  Grundlagen:  { de: "Grundlagen", en: "Basics" },
  Technik:     { de: "Technik",    en: "Tech" },
  Tipps:       { de: "Tipps",      en: "Tips" },
  Plattformen: { de: "Plattformen",en: "Platforms" },
};

interface Props {
  article: RessourceArticle;
  lang: Lang;
}

export default function ArticleCard({ article, lang }: Props) {
  const catLabel = categoryLabels[article.category]?.[lang] ?? article.category;

  return (
    <Link
      href={lang === "en" ? `/en/knowledge/${article.slug}` : `/ressourcen/${article.slug}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem",
          borderRadius: "16px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
          cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
          (e.currentTarget as HTMLDivElement).style.borderColor = `${article.categoryColor.replace("var(", "").replace(")", "")}30`.replace("--accent-purple", "rgba(139,92,246").replace("--accent-cyan", "rgba(56,189,248").replace("--accent-gold", "rgba(196,181,253");
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
        }}
      >
        {/* Hero icon */}
        <div
          style={{
            padding: "0.75rem",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.04)",
            width: "fit-content",
            display: "flex",
          }}
        >
          <HeroIcon name={article.heroIcon} size={26} strokeWidth={1.75} color={article.categoryColor} />
        </div>

        {/* Category + reading time */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            className="label"
            style={{
              color: article.categoryColor,
              background: `color-mix(in srgb, ${article.categoryColor} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${article.categoryColor} 30%, transparent)`,
              padding: "0.2rem 0.6rem",
              borderRadius: "20px",
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
            }}
          >
            {catLabel}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
            {article.readingTimeMinutes} {lang === "de" ? "Min. Lesezeit" : "min read"}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            color: "var(--text-primary)",
            fontSize: "1rem",
            fontWeight: 700,
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          {article.title[lang]}
        </h3>

        {/* Teaser */}
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            lineHeight: 1.55,
            margin: 0,
            flex: 1,
          }}
        >
          {article.teaser[lang]}
        </p>

        {/* CTA link */}
        <span
          style={{
            color: article.categoryColor,
            fontSize: "0.8rem",
            fontWeight: 600,
            marginTop: "auto",
          }}
        >
          {lang === "de" ? "Artikel lesen →" : "Read article →"}
        </span>
      </div>
    </Link>
  );
}
