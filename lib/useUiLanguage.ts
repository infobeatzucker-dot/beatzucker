"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types/mastering";

// Account routes keep their existing URLs and inherit the selected language.
export function useUiLanguage(): Lang {
  const [lang, setLang] = useState<Lang>("de");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    let saved: string | null = null;
    try { saved = localStorage.getItem("beatzucker-language"); } catch { /* optional storage */ }
    const next = requested === "en" || requested === "de" ? requested
      : saved === "en" || document.documentElement.lang === "en" ? "en" : "de";
    setLang(next);
    document.documentElement.lang = next;
    try { localStorage.setItem("beatzucker-language", next); } catch { /* optional storage */ }
  }, []);
  return lang;
}
