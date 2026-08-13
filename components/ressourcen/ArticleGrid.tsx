"use client";

import { useState, useMemo } from "react";
import ArticleCard from "./ArticleCard";
import type { RessourceArticle, ArticleCategory } from "@/app/data/ressourcen";

type Lang = "de" | "en";

const CATEGORIES: { key: "all" | ArticleCategory; de: string; en: string }[] = [
  { key: "all",        de: "Alle",       en: "All" },
  { key: "Grundlagen", de: "Grundlagen", en: "Basics" },
  { key: "Technik",    de: "Technik",    en: "Tech" },
  { key: "Tipps",      de: "Tipps",      en: "Tips" },
  { key: "Plattformen",de: "Plattformen",en: "Platforms" },
];

interface Props {
  articles: RessourceArticle[];
}

export default function ArticleGrid({ articles }: Props) {
  const [lang, setLang] = useState<Lang>("de");
  const [category, setCategory] = useState<"all" | ArticleCategory>("all");

  const filtered = useMemo(
    () => (category === "all" ? articles : articles.filter((a) => a.category === category)),
    [articles, category]
  );

  return (
    <div>
      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {/* Category tabs */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: "20px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.15s",
                background: category === cat.key ? "rgba(124,111,255,0.15)" : "transparent",
                borderColor: category === cat.key ? "rgba(124,111,255,0.4)" : "rgba(255,255,255,0.1)",
                color: category === cat.key ? "var(--accent-purple)" : "var(--text-muted)",
              }}
            >
              {cat[lang]}
            </button>
          ))}
        </div>

        {/* Language toggle */}
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {(["de", "en"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.15s",
                background: lang === l ? "rgba(0,229,196,0.1)" : "transparent",
                borderColor: lang === l ? "rgba(0,229,196,0.3)" : "rgba(255,255,255,0.1)",
                color: lang === l ? "var(--accent-cyan)" : "var(--text-muted)",
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "0 0 1.5rem" }}>
        {filtered.length} {lang === "de" ? "Artikel" : "articles"}
      </p>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {filtered.map((article) => (
          <ArticleCard key={article.slug} article={article} lang={lang} />
        ))}
      </div>
    </div>
  );
}
