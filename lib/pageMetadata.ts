import type { Metadata } from "next";

/** Fill social metadata from the page's own canonical and localized copy.
 * Next merges nested metadata shallowly: inherited root previews are unsafe.
 * Canonicals, indexing rules and article dates are deliberately preserved.
 */
export function pageMetadata(metadata: Metadata): Metadata {
  const canonical = metadata.alternates?.canonical;
  if (!(typeof canonical === "string" || canonical instanceof URL)) return metadata;
  const url = new URL(String(canonical), "https://beatzucker.de");
  const en = /^\/en(?:\/|$)/.test(url.pathname) || ["/privacy", "/terms", "/legal-notice", "/cancellation-policy"].includes(url.pathname);
  const rawTitle = typeof metadata.title === "string" ? metadata.title
    : metadata.title && "absolute" in metadata.title ? metadata.title.absolute
    : metadata.title && "default" in metadata.title ? metadata.title.default : null;
  if (!rawTitle || !metadata.description) return metadata;
  const title = rawTitle.includes("Beatzucker") ? rawTitle : `${rawTitle} | Beatzucker`;
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: title };
  return {
    ...metadata,
    openGraph: {
      type: "website",
      ...metadata.openGraph,
      url: url.href,
      siteName: "Beatzucker",
      title,
      description: metadata.description,
      locale: en ? "en_US" : "de_DE",
      alternateLocale: [en ? "de_DE" : "en_US"],
      images: metadata.openGraph?.images ?? [image],
    },
    twitter: {
      ...metadata.twitter,
      card: "summary_large_image",
      title,
      description: metadata.description,
      images: [image],
    },
  };
}
