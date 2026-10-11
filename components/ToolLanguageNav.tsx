"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/types/mastering";

export default function ToolLanguageNav({lang}:{lang:Lang}) {
  const pathname = usePathname();
  const base = pathname.startsWith("/en/") ? pathname.slice(3) : pathname;
  if (base !== "/mix-check" && base !== "/tools" && !base.startsWith("/tools/")) return null;
  return <nav className="tool-language-nav" aria-label={lang==="en"?"Tool language":"Tool-Sprache"}>
    <span>{lang==="en"?"Language":"Sprache"}</span>
    <Link href={base} hrefLang="de" aria-current={lang==="de"?"page":undefined}>Deutsch</Link>
    <Link href={`/en${base}`} hrefLang="en" aria-current={lang==="en"?"page":undefined}>English</Link>
  </nav>;
}
