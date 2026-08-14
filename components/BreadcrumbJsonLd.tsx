interface Props {
  /** Page name and its own URL — Home is always position 1 */
  name: string;
  url: string;
}

/** Minimal BreadcrumbList structured data for one-level-deep pages
 * (e.g. /features, /help) that don't need a visible breadcrumb nav. */
export default function BreadcrumbJsonLd({ name, url }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "UpMaDo", item: "https://upmado.com" },
      { "@type": "ListItem", position: 2, name, item: url },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
