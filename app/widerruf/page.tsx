import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung – UpMaDo",
  description: "Widerrufsbelehrung für den kostenlosen Audio-Mastering-Dienst UpMaDo — als Gratis-Angebot ist kein gesetzliches Widerrufsrecht anwendbar.",
  alternates: { canonical: "https://upmado.com/widerruf" },
  robots: { index: true, follow: true },
};

const SECTIONS = [
  { id: "kostenlos", label: "Kein Widerrufsrecht" },
];

export default function WiderrufPage() {
  return (
    <LegalLayout title="Widerrufsbelehrung" activePage="widerruf" sections={SECTIONS}>

      <div className="legal-section" id="kostenlos">
        <h2>Kein Widerrufsrecht anwendbar</h2>
        <p>
          UpMaDo ist ein vollständig kostenloser Dienst. Die Nutzung begründet kein entgeltliches
          Vertragsverhältnis, sodass ein gesetzliches Widerrufsrecht im Sinne des § 355 BGB nicht
          anwendbar ist. Es fallen keine Zahlungen an, die zurückerstattet werden könnten.
        </p>
      </div>

      <div className="legal-meta">
        Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })} · UpMaDo ·{" "}
        <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
      </div>
    </LegalLayout>
  );
}
