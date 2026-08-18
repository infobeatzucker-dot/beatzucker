"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Promotion {
  id: string;
  title: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  bgStyle: string;
}

const BG_STYLES: Record<string, { border: string; bg: string; glow: string; badge: string }> = {
  purple: {
    border: "rgba(139,92,246,0.6)",
    bg: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(56,189,248,0.06) 100%)",
    glow: "rgba(139,92,246,0.25)",
    badge: "linear-gradient(135deg, #8b5cf6, #38bdf8)",
  },
  cyan: {
    border: "rgba(56,189,248,0.6)",
    bg: "linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(139,92,246,0.06) 100%)",
    glow: "rgba(56,189,248,0.22)",
    badge: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  },
  gold: {
    border: "rgba(196,181,253,0.6)",
    bg: "linear-gradient(135deg, rgba(196,181,253,0.15) 0%, rgba(245,130,32,0.08) 100%)",
    glow: "rgba(196,181,253,0.22)",
    badge: "linear-gradient(135deg, #c4b5fd, #f08020)",
  },
  fire: {
    border: "rgba(239,68,68,0.6)",
    bg: "linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(245,130,32,0.08) 100%)",
    glow: "rgba(239,68,68,0.22)",
    badge: "linear-gradient(135deg, #ef4444, #f59e0b)",
  },
};

export default function PromoPopup() {
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/promo")
      .then(r => r.json())
      .then((data: Promotion | null) => {
        if (!data) return;
        const key = `beatzucker_promo_dismissed_${data.id}`;
        if (localStorage.getItem(key)) return;
        setPromo(data);
        setTimeout(() => setVisible(true), 600);
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    if (promo) localStorage.setItem(`beatzucker_promo_dismissed_${promo.id}`, "1");
    setVisible(false);
  }

  const style = BG_STYLES[promo?.bgStyle ?? "purple"] ?? BG_STYLES.purple;

  return (
    <AnimatePresence>
      {visible && promo && (
        <>
          {/* Backdrop */}
          <motion.div
            key="promo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={dismiss}
            style={{
              position: "fixed", inset: 0, zIndex: 9000,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* Popup card */}
          <motion.div
            key="promo-card"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{
              position: "fixed", zIndex: 9001,
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(480px, 92vw)",
              background: "rgba(10,12,22,0.97)",
              border: `1px solid ${style.border}`,
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: `0 0 60px ${style.glow}, 0 24px 60px rgba(0,0,0,0.6)`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gradient top bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: style.badge, borderRadius: "20px 20px 0 0",
            }} />

            {/* Close button */}
            <button
              onClick={dismiss}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "50%", width: 32, height: 32,
                color: "var(--text-muted)", fontSize: "1.1rem",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >×</button>

            {/* Badge */}
            <div style={{
              display: "inline-block", marginBottom: "1rem",
              background: style.badge,
              borderRadius: "6px", padding: "0.2rem 0.75rem",
              fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#fff",
            }}>Aktion</div>

            {/* Title */}
            <h2 style={{
              margin: "0 0 0.75rem",
              fontSize: "1.45rem", fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.25,
            }}>{promo.title}</h2>

            {/* Body */}
            <p style={{
              margin: "0 0 1.5rem",
              color: "var(--text-secondary)",
              fontSize: "0.93rem", lineHeight: 1.65,
              whiteSpace: "pre-wrap",
            }}>{promo.body}</p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {promo.ctaText && promo.ctaUrl && (
                <a
                  href={promo.ctaUrl}
                  onClick={dismiss}
                  style={{
                    background: style.badge,
                    border: "none", borderRadius: "10px",
                    padding: "0.65rem 1.4rem",
                    color: "#fff", fontSize: "0.9rem", fontWeight: 700,
                    cursor: "pointer", textDecoration: "none",
                    display: "inline-block",
                  }}
                >{promo.ctaText}</a>
              )}
              <button
                onClick={dismiss}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px", padding: "0.65rem 1.2rem",
                  color: "var(--text-muted)", fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >Schließen</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
