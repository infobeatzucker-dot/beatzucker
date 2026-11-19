"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Lang } from "@/lib/types/mastering";

export default function ScrollToTop({ lang = "de" }: { lang?: Lang }) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={reducedMotion ? false : { opacity: 0, scale: 0.7, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 16 }}
          transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
          onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" })}
          aria-label={lang === "de" ? "Nach oben scrollen" : "Scroll to top"}
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 60,
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid rgba(var(--bz-border-8b5cf6),0.35)",
            background: "rgba(var(--bz-paint-0e1117),0.85)",
            backdropFilter: "blur(12px)",
            color: "var(--accent-purple)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 24px rgba(var(--bz-shadow-8b5cf6),0.2)",
          }}
          whileHover={reducedMotion ? undefined : {
            scale: 1.1,
            boxShadow: "0 4px 32px rgba(var(--bz-shadow-8b5cf6),0.45)",
            borderColor: "rgba(var(--bz-border-8b5cf6),0.7)",
          }}
          whileTap={reducedMotion ? undefined : { scale: 0.93 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 14V4M9 4L4 9M9 4L14 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
