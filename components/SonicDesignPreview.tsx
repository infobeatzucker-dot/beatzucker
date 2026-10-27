"use client";
import { useEffect, useState } from "react";
import MasteringProgressModal from "@/components/MasteringProgressModal";
import StudioMotionPreview from "@/components/StudioMotionPreview";
const stages = ["waiting", "analyzing", "preparing", "dc", "gain", "eq", "deesser", "compression", "ms", "saturation", "final_eq", "bus_compression", "limiting", "dithering", "codec_verify", "post_analysis"];
export default function SonicDesignPreview() {
  const [index, setIndex] = useState(2), [lang, setLang] = useState<"de" | "en">("de"), [open, setOpen] = useState(true);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setIndex(i => (i + (event.key === "ArrowRight" ? 1 : stages.length - 1)) % stages.length); }
      if (event.key.toLowerCase() === "l") setLang(l => l === "de" ? "en" : "de");
      if (event.key === "Enter" && open) setOpen(false);
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [open]);
  return <main style={{ minHeight: "100vh", background: "rgb(var(--bz-paint-070918))", color: "rgb(var(--bz-paint-eeeeee))", padding: 24 }}>
    <p style={{ position: "fixed", zIndex: 90, top: 8, left: 12, fontSize: 12, background: "rgb(var(--bz-paint-070918))", padding: 8 }}>Nur Designvorschau · ← / → Phase · L Sprache · Enter Abschluss und Upload-/Player-Vorschau</p>
    <button onClick={() => setOpen(true)}>Vorschau öffnen</button>
    {!open && <StudioMotionPreview lang={lang} />}
    <MasteringProgressModal isOpen={open} completed={!open} lang={lang} step={{ step: stages[index], progress: Math.round(index / (stages.length - 1) * 96), label: `${lang === "de" ? "Designvorschau" : "Design preview"} · ${stages[index]}` }} />
  </main>;
}
