"use client";

import type { Lang } from "@/lib/types/mastering";

export default function CookieReopenButton({ lang = "de" }: { lang?: Lang }) {
  function reopen() {
    window.dispatchEvent(new Event("open-cookie-banner"));
  }

  return (
    <button
      onClick={reopen}
      style={{
        background: "none",
        border: "none",
        color: "inherit",
        fontSize: "inherit",
        cursor: "pointer",
        padding: 0,
        textDecoration: "none",
      }}
      className="hover:text-white transition-colors"
    >
      {lang === "de" ? "Cookie-Einstellungen" : "Cookie settings"}
    </button>
  );
}
