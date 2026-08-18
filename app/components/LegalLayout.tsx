import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import PrintButton from "./PrintButton";

interface LegalSection {
  id: string;
  label: string;
}

interface LegalLayoutProps {
  title: string;
  activePage?: "agb" | "datenschutz" | "widerruf" | "impressum" | "terms" | "privacy";
  sections?: LegalSection[];
  children: React.ReactNode;
  lang?: "de" | "en";
}

const NAV_ITEMS_DE = [
  { key: "agb",         href: "/agb",         label: "AGB" },
  { key: "datenschutz", href: "/datenschutz",  label: "Datenschutz" },
  { key: "widerruf",    href: "/widerruf",     label: "Widerruf" },
  { key: "impressum",   href: "/impressum",    label: "Impressum" },
];

const NAV_ITEMS_EN = [
  { key: "terms",   href: "/terms",   label: "Terms of Service" },
  { key: "privacy", href: "/privacy", label: "Privacy Policy" },
];

export default function LegalLayout({ title, activePage, sections, children, lang = "de" }: LegalLayoutProps) {
  const NAV_ITEMS = lang === "en" ? NAV_ITEMS_EN : NAV_ITEMS_DE;
  const tocLabel  = lang === "en" ? "Table of Contents" : "Inhaltsverzeichnis";
  const badge     = lang === "en" ? "Legal" : "Rechtliches";
  const dateLabel = lang === "en" ? "As of March 2026" : "Stand: März 2026";

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <Header />

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "6rem 2rem 5rem" }}>

        {/* Top row: badge + Stand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: "6px",
            padding: "0.25rem 0.75rem",
            fontSize: "0.75rem",
            color: "var(--accent-purple)",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}>
            {badge}
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "6px",
            padding: "0.25rem 0.75rem",
            fontSize: "0.72rem",
            color: "#10b981",
            letterSpacing: "0.05em",
          }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="4" fill="#10b981"/>
            </svg>
            {dateLabel}
          </div>
        </div>

        {/* H1 */}
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "1.75rem", color: "var(--text-primary)" }}>
          {title}
        </h1>

        {/* Legal page navigation tabs */}
        <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                style={{
                  padding: "0.35rem 0.9rem",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: "none",
                  background: isActive
                    ? "rgba(139,92,246,0.18)"
                    : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? "1px solid rgba(139,92,246,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: isActive ? "var(--accent-purple)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Table of contents (if sections provided) */}
        {sections && sections.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
            padding: "1.25rem 1.5rem",
            marginBottom: "2.5rem",
          }}>
            <div style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "0.75rem",
            }}>
              {tocLabel}
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "0.4rem 1.5rem" }}>
              {sections.map((sec, i) => (
                <li key={sec.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{i + 1}.</span>
                  <a
                    href={`#${sec.id}`}
                    style={{
                      color: "var(--accent-cyan)",
                      fontSize: "0.82rem",
                      textDecoration: "none",
                    }}
                  >
                    {sec.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Main content */}
        <div className="legal-content">
          {children}
        </div>

        {/* Bottom print link */}
        <div style={{ marginTop: "3rem", textAlign: "right" as const }}>
          <PrintButton />
        </div>

      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
