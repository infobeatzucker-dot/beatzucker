import type { RefObject } from "react";
import type { Lang } from "@/lib/types/mastering";
/** Navigation only: keeps the player mounted, its current position and autoplay unchanged. */
export default function DownloadJumpButton({ target, targetId, lang }: { target: RefObject<HTMLHeadingElement | null>; targetId: string; lang: Lang }) {
  return <button type="button" className="studio-download-jump" aria-controls={targetId}
    onClick={() => {
      const heading = target.current;
      if (!heading) return;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }}>
    <span>{lang === "de" ? "Zum Download" : "Go to downloads"}</span><span aria-hidden="true">↓</span>
  </button>;
}
