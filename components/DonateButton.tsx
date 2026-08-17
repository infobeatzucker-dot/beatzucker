"use client";

import { DONATE_URL } from "@/lib/constants";

interface Props {
  variant?: "nav" | "footer" | "panel";
}

export default function DonateButton({ variant = "nav" }: Props) {
  if (variant === "footer") {
    return (
      <a
        href={DONATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity inline-flex items-center gap-1"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <span>☕</span> Spenden
      </a>
    );
  }

  if (variant === "panel") {
    return (
      <div
        className="mt-4 p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap"
        style={{
          background: "linear-gradient(135deg, rgba(245,200,66,0.08), rgba(124,111,255,0.05))",
          border: "1px solid rgba(245,200,66,0.25)",
        }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--accent-gold)" }}>
            Gefällt dir Beatzucker?
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Beatzucker ist komplett kostenlos. Wenn's dir geholfen hat, freuen wir uns über einen Kaffee ☕
          </div>
        </div>
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, var(--accent-gold), #e8a000)",
            color: "#000",
            textDecoration: "none",
          }}
        >
          ☕ Spenden
        </a>
      </div>
    );
  }

  // nav (default) — compact pill for the header
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Beatzucker unterstützen"
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
      style={{
        background: "rgba(245,200,66,0.1)",
        border: "1px solid rgba(245,200,66,0.3)",
        color: "var(--accent-gold)",
        textDecoration: "none",
      }}
    >
      ☕ Spenden
    </a>
  );
}
