import { SlidersHorizontal, Headphones, Wand2 } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

export default function ManualMasteringExplainer({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const steps = [
    { icon: SlidersHorizontal, title: en ? "Fine-tune your sound" : "Deinen Sound nachjustieren",
      text: en ? "After auto-mastering, open Manual and adjust EQ, dynamics or stereo width to your taste." : "Öffne nach dem Auto-Mastering den Bereich „Manuell“ und passe zum Beispiel EQ, Dynamik oder Stereobreite nach deinem Geschmack an." },
    { icon: Headphones, title: en ? "Listen while adjusting" : "Beim Einstellen hören",
      text: en ? "Hear your changes in the live preview and compare them before committing. The preview helps you choose your settings; it is not the final export." : "Höre deine Änderungen in der Live-Vorschau und vergleiche sie, bevor du sie übernimmst. Die Vorschau hilft beim Einstellen – sie ist noch nicht der fertige Export." },
    { icon: Wand2, title: en ? "Create your new master" : "Deinen neuen Master erstellen",
      text: en ? "Apply your settings to run mastering again. Download the newly rendered result once processing is complete." : "Übernimm deine Einstellungen und starte das Mastering erneut. Nach der Berechnung kannst du das neu gerenderte Ergebnis herunterladen." },
  ];
  return <aside className="glass-panel p-6 mt-8" aria-label={en ? "Optional manual mastering" : "Optionales manuelles Mastering"}>
    <div className="label mb-3">{en ? "OPTIONAL · AFTER AUTO-MASTERING" : "OPTIONAL · NACH DEM AUTO-MASTERING"}</div>
    <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>{en ? "The starting point is automatic. The finishing touches are yours." : "Der Start ist automatisch. Der Feinschliff gehört dir."}</h3>
    <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>{en ? "Happy with the auto-master? Download it directly. Want more control? Fine-tune it manually." : "Zufrieden mit dem Auto-Master? Lade ihn direkt herunter. Du möchtest mehr Kontrolle? Justiere ihn manuell nach."}</p>
    <ol className="grid md:grid-cols-3 gap-5">
      {steps.map((step, index) => <li key={step.title}>
        <div className="flex items-center gap-2 mb-2" style={{ color: "var(--accent-cyan)" }}><step.icon size={18}/><span className="text-sm font-semibold">{index + 1}. {step.title}</span></div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.text}</p>
      </li>)}
    </ol>
  </aside>;
}
