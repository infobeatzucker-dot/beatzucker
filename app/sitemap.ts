import { MetadataRoute } from "next";
import { ARTICLES } from "@/app/data/ressourcen";

const BASE = "https://beatzucker.de";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    /* ── Core pages ──────────────────────────────────────────── */
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/features`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/help`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },

    /* ── Ressourcen / Wissen ──────────────────────────────────── */
    {
      url: `${BASE}/ressourcen`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...ARTICLES.map((a) => ({
      url: `${BASE}/ressourcen/${a.slug}`,
      lastModified: new Date(a.updatedAt ?? a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    /* ── Legal – German ───────────────────────────────────────── */
    {
      url: `${BASE}/impressum`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/datenschutz`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/agb`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/widerruf`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.1,
    },
    /* ── Legal – English ──────────────────────────────────────── */
    {
      url: `${BASE}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
