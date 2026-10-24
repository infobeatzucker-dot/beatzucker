import type { MetadataRoute } from "next";
import { ARTICLES } from "@/app/data/ressourcen";
import { RELEASE_DATE } from "@/lib/releases";
import { articleContentDate, GUIDANCE_UPDATED, TOOL_GUIDES } from "@/lib/toolGuidance";

const BASE = "https://beatzucker.de";

// Dates refer to meaningful content changes, not requests or every new release.
// Keep unchanged legal/help/support dates independent of RELEASE_DATE.
export default function sitemap(): MetadataRoute.Sitemap {
  const pair = (de: string, en: string, modified: string, priority: number): MetadataRoute.Sitemap => {
    const languages = { "de-DE": BASE + de, en: BASE + en, "x-default": BASE + de };
    return [de, en].map(path => ({
      url: BASE + path, lastModified: new Date(modified),
      changeFrequency: "monthly", priority, alternates: { languages },
    }));
  };
  return [
    ...pair("", "/en", "2026-10-24", 1),
    ...pair("/features", "/en/features", "2026-10-24", 0.9),
    ...pair("/help", "/en/help", "2026-10-24", 0.7),
    ...pair("/in-eigener-sache", "/en/support", "2026-10-11", 0.5),
    ...pair("/versionen", "/en/updates", RELEASE_DATE, 0.5),
    ...pair("/hoervergleich", "/en/mastering-examples", "2026-10-18", 0.8),
    ...pair("/mix-check", "/en/mix-check", GUIDANCE_UPDATED, 0.9),
    ...pair("/tools", "/en/tools", "2026-10-18", 0.9),
    ...["vocal-remover", "stem-separation"].flatMap(slug => pair(`/tools/${slug}`, `/en/tools/${slug}`, "2026-10-18", 0.6)),
    ...Object.keys(TOOL_GUIDES).filter(slug => slug !== "mix-check").flatMap(slug =>
      pair(`/tools/${slug}`, `/en/tools/${slug}`, ["speech-cleaner","stereo-phase","wav-to-mp3","audio-cutter"].includes(slug) ? "2026-10-18" : "2026-10-17", 0.8)),
    ...pair("/ressourcen", "/en/knowledge", "2026-10-24", 0.8),
    ...ARTICLES.flatMap(article => pair(`/ressourcen/${article.slug}`, `/en/knowledge/${article.slug}`, articleContentDate(article), 0.7)),
    ...pair("/impressum", "/legal-notice", "2026-08-23", 0.2),
    ...pair("/datenschutz", "/privacy", "2026-10-20", 0.2),
    ...pair("/agb", "/terms", "2026-08-23", 0.2),
    ...pair("/widerruf", "/cancellation-policy", "2026-10-20", 0.1),
  ];
}
