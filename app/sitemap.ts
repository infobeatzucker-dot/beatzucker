import { MetadataRoute } from "next";
import { ARTICLES } from "@/app/data/ressourcen";

const BASE = "https://beatzucker.de";

export default function sitemap(): MetadataRoute.Sitemap {
  // Keep this value tied to a meaningful public-content release. Google may
  // ignore lastModified when a sitemap claims every page changed on each hit.
  const coreUpdated = new Date("2026-08-20");

  return [
    /* ── Core pages ──────────────────────────────────────────── */
    {
      url: BASE,
      lastModified: coreUpdated,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/en`,
      lastModified: coreUpdated,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/features`,
      lastModified: coreUpdated,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/help`,
      lastModified: coreUpdated,
      changeFrequency: "monthly",
      priority: 0.7,
    },

    /* ── Ressourcen / Wissen ──────────────────────────────────── */
    {
      url: `${BASE}/ressourcen`,
      lastModified: coreUpdated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/en/knowledge`,
      lastModified: coreUpdated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...ARTICLES.map((a) => ({
      url: `${BASE}/ressourcen/${a.slug}`,
      lastModified: new Date(a.updatedAt ?? a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...ARTICLES.map((a) => ({
      url: `${BASE}/en/knowledge/${a.slug}`,
      lastModified: new Date(a.updatedAt ?? a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    /* ── Legal – German ───────────────────────────────────────── */
    {
      url: `${BASE}/impressum`,
      lastModified: coreUpdated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/datenschutz`,
      lastModified: coreUpdated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/agb`,
      lastModified: coreUpdated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/widerruf`,
      lastModified: coreUpdated,
      changeFrequency: "yearly",
      priority: 0.1,
    },
    /* ── Legal – English ──────────────────────────────────────── */
    {
      url: `${BASE}/terms`,
      lastModified: coreUpdated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: coreUpdated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
