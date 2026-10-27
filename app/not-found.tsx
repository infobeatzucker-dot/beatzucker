import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  description: "Diese Seite existiert nicht oder wurde verschoben.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function NotFound() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <Header />
      <main style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "8rem 1.5rem 6rem",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "5rem",
          fontWeight: 900,
          background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          marginBottom: "1rem",
        }}>
          404
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "rgb(var(--bz-paint-ffffff))", marginBottom: "0.75rem" }}>
          Seite nicht gefunden
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{
            padding: "0.65rem 1.5rem",
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
            color: "rgb(var(--bz-paint-ffffff))",
            fontWeight: 700,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}>
            Zur Startseite
          </Link>
          <Link href="/features" style={{
            padding: "0.65rem 1.5rem",
            borderRadius: "8px",
            border: "1px solid rgba(var(--bz-border-ffffff),0.12)",
            color: "var(--text-secondary)",
            fontWeight: 600,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}>
            Features ansehen
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
