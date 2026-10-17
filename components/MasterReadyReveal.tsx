import type { ReactNode } from "react";
import type { Lang } from "@/lib/types/mastering";
/** One-shot visual hand-off. Does not delay results or control audio playback. */
export default function MasterReadyReveal({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <section className="studio-master-ready">
    <div className="studio-ready-heading" role="status">
      <span className="studio-ready-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" pathLength="1" /></svg></span>
      <div><h3>{lang === "de" ? "Dein Master ist bereit." : "Your master is ready."}</h3><p>{lang === "de" ? "Original und Master direkt vergleichen." : "Compare your original and master side by side."}</p></div>
      <span className="studio-ready-tag" aria-hidden="true">MASTER / READY</span>
    </div>
    {children}
  </section>;
}
