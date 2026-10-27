"use client";
import { useId, useRef, useState } from "react";
import UploadSignal from "@/components/UploadSignal";
import MasterReadyReveal from "@/components/MasterReadyReveal";
import ABPlayer from "@/components/ABPlayer";
import { AudioEngineProvider } from "@/contexts/AudioEngineContext";
import type { Lang } from "@/lib/types/mastering";
import DownloadJumpButton from "@/components/DownloadJumpButton";
import MasterOverview from "@/components/MasterOverview";
import showcase from "@/public/audio/showcase/manifest.json";
/** Development-only parent route. Upload states are illustrations, audio is a real public excerpt. */
export default function StudioMotionPreview({ lang }: { lang: Lang }) {
  const downloadHeading = useRef<HTMLHeadingElement>(null), downloadHeadingId = useId();
  const [upload, setUpload] = useState("idle"), [reveal, setReveal] = useState(0);
  const track = showcase.tracks.find(track => track.id === "on-tour")!;
  return <div className="studio-overview-preview" style={{ maxWidth: 1200, margin: "75px auto 30px" }}>
    <div><p style={{ color: "rgb(var(--bz-paint-aab4cd))", fontSize: 12 }}>Übersicht mit gemessenen Werten der öffentlichen Hörprobe.</p><MasterOverview lang={lang} result={{ filename: "On Tour · öffentliche Hörprobe", before: { integrated_lufs: track.original.metrics.lufs }, after: { integrated_lufs: track.master.metrics.lufs, true_peak: track.master.metrics.truePeak } }} /></div>
    <div>
    <p style={{ color: "rgb(var(--bz-paint-aab4cd))", fontSize: 13, marginBottom: 20 }}>Designvorschau: Upload-Zustände ohne Upload. Der A/B-Player nutzt die vorhandene öffentliche Hörprobe „On Tour“.</p>
    <div className={`upload-zone studio-upload-zone ${upload === "drag" ? "drag-over" : ""}`} style={{ padding: 24, textAlign: "center", marginBottom: 16 }}>
      <UploadSignal dragging={upload === "drag"} phase={upload === "received" ? "received" : upload === "uploading" ? "uploading" : "idle"} progress={58} />
      <p>{upload === "received" ? "Upload bestätigt · Designvorschau" : upload === "uploading" ? "58 % · Designvorschau" : "Track hochladen"}</p>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 30 }}>{["idle", "drag", "uploading", "received"].map(state => <button key={state} onClick={() => setUpload(state)} aria-pressed={upload === state} style={{ border: "1px solid rgba(var(--bz-border-8385aa),0.33333)", padding: "8px 12px", borderRadius: 8 }}>{state}</button>)}</div>
    <button onClick={() => setReveal(n => n + 1)} style={{ fontSize: 12, marginBottom: 16 }}>Abschlussanimation erneut zeigen</button>
    <AudioEngineProvider originalUrl="/audio/showcase/on-tour-original-d70be4cc0717.mp3" masteredUrl="/audio/showcase/on-tour-master-487537959d6f.mp3">
      <MasterReadyReveal key={reveal} lang={lang}>
        <ABPlayer filename="On Tour · öffentliche Hörprobe" lang={lang} />
        <DownloadJumpButton target={downloadHeading} targetId={downloadHeadingId} lang={lang} />
      </MasterReadyReveal>
    </AudioEngineProvider>
    <section style={{ marginTop: 26, padding: 24, border: "1px solid rgba(var(--bz-border-859abd),0.25098)", borderRadius: 16, background: "rgb(var(--bz-paint-121a2a))" }}>
      <h3 ref={downloadHeading} id={downloadHeadingId} tabIndex={-1} className="studio-download-target">{lang === "de" ? "Download der Hörprobe" : "Download the listening excerpt"}</h3>
      <p style={{ color: "rgb(var(--bz-paint-aab4cd))", fontSize: 13, margin: "12px 0" }}>{lang === "de" ? "Nur Designvorschau: Dies ist die öffentliche On-Tour-Hörprobe, kein vollständiger Master. In deinem echten Ergebnis stehen hier die erzeugten Downloadformate." : "Design preview only: this is the public On Tour excerpt, not a full master. Your actual result lists the generated download formats here."}</p>
      <a href="/audio/showcase/on-tour-master-487537959d6f.mp3" download="beatzucker_on-tour_hoerprobe.mp3" className="studio-download-jump">{lang === "de" ? "Hörprobe als MP3 herunterladen ↓" : "Download MP3 excerpt ↓"}</a>
    </section>
    </div>
  </div>;
}
