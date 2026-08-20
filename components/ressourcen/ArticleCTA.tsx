import Link from "next/link";

type Lang = "de" | "en";

interface Props {
  lang: Lang;
  variant?: "default" | "hero";
}

export default function ArticleCTA({ lang, variant = "default" }: Props) {
  const isHero = variant === "hero";

  return (
    <div
      className="glass-panel-elevated"
      style={{
        padding: isHero ? "2.5rem 2rem" : "2rem",
        borderRadius: "16px",
        textAlign: "center",
        margin: "2.5rem 0",
        background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(56,189,248,0.06) 100%)",
        border: "1px solid rgba(139,92,246,0.2)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow orb */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Badge */}
        <span
          className="label"
          style={{
            display: "inline-block",
            color: "var(--accent-cyan)",
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.25)",
            padding: "0.25rem 0.75rem",
            borderRadius: "20px",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            marginBottom: "1rem",
          }}
        >
          {lang === "de" ? "JETZT STARTEN" : "GET STARTED"}
        </span>

        <h3
          style={{
            color: "var(--text-primary)",
            fontSize: isHero ? "1.6rem" : "1.25rem",
            fontWeight: 800,
            margin: "0 0 0.75rem",
            lineHeight: 1.3,
          }}
        >
          {lang === "de"
            ? "Deinen Track jetzt professionell mastern"
            : "Master Your Track Professionally Now"}
        </h3>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            margin: "0 0 1.5rem",
            maxWidth: "480px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          {lang === "de"
            ? "Beatzucker mastert deinen Track in Sekunden — adaptiv, plattformoptimiert, kostenlos starten."
            : "Beatzucker masters your track in seconds — adaptive, platform-optimized, free to start."}
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href={lang === "en" ? "/en" : "/"}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.75rem",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent-purple) 0%, #6055e8 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              textDecoration: "none",
              transition: "opacity 0.2s, transform 0.2s",
              boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
            }}
          >
            {lang === "de" ? "Kostenlos mastern →" : "Master for free →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
