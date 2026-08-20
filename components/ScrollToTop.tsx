"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Lang } from "@/lib/types/mastering";

export default function ScrollToTop({ lang = "de" }: { lang?: Lang }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={lang === "de" ? "Nach oben scrollen" : "Scroll to top"}
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 60,
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid rgba(139,92,246,0.35)",
            background: "rgba(14,17,23,0.85)",
            backdropFilter: "blur(12px)",
            color: "var(--accent-purple)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 24px rgba(139,92,246,0.2)",
          }}
          whileHover={{
            scale: 1.1,
            boxShadow: "0 4px 32px rgba(139,92,246,0.45)",
            borderColor: "rgba(139,92,246,0.7)",
          }}
          whileTap={{ scale: 0.93 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 14V4M9 4L4 9M9 4L14 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
