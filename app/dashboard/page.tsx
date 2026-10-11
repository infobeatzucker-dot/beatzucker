"use client";

import MasteringWorkspace from "@/components/MasteringWorkspace";
import { useUiLanguage } from "@/lib/useUiLanguage";

export default function DashboardPage() {
  const lang = useUiLanguage();
  const en = lang === "en";
  return (
    <div>
      <div className="workspace-page-heading">
        <div>
          <span className="workspace-eyebrow">{en ? "ADAPTIVE MASTERING STUDIO" : "KI-MASTERING-STUDIO"}</span>
          <h1>{en ? "Transform your sound." : "Verwandle deinen Sound."}</h1>
          <p>{en ? "Upload your track, analyze it precisely and export your professional master." : "Track hochladen, präzise analysieren und direkt als professionelles Master exportieren."}</p>
        </div>
        <span className="workspace-free-badge"><i /> {en ? "100% free" : "100 % kostenlos"}</span>
      </div>
      <MasteringWorkspace lang={lang} />
    </div>
  );
}
