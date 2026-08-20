"use client";

import Link from "next/link";
import type { RessourceArticle } from "@/app/data/ressourcen";
import { HeroIcon } from "@/lib/heroIcons";

type Lang = "de" | "en";

interface Props {
  articles: RessourceArticle[];
  lang: Lang;
}

export default function RelatedArticles({ articles, lang }: Props) {
  if (!articles.length) return null;

  return (
    <div style={{ marginTop: "3rem" }}>
      <h3
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          margin: "0 0 1rem",
        }}
      >
        {lang === "de" ? "Verwandte Artikel" : "Related Articles"}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={lang === "en" ? `/en/knowledge/${a.slug}` : `/ressourcen/${a.slug}`}
            style={{ textDecoration: "none" }}
          >
            <div
              className="glass-panel"
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                border: "1px solid rgba(255,255,255,0.06)",
                transition: "border-color 0.2s, transform 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <HeroIcon name={a.heroIcon} size={22} strokeWidth={1.75} color={a.categoryColor} />
              <div>
                <div style={{ color: "var(--text-primary)", fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.3 }}>
                  {a.title[lang]}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.2rem" }}>
                  {a.readingTimeMinutes} {lang === "de" ? "Min." : "min"} ·{" "}
                  <span style={{ color: a.categoryColor }}>{a.category}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
