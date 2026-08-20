import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: { absolute: "Impressum – Beatzucker" },
  description: "Impressum und Anbieterkennzeichnung von Beatzucker gemäß §5 TMG — Anbieter, Kontakt und rechtliche Hinweise zum kostenlosen Mastering-Dienst.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://beatzucker.de/impressum",
    languages: {
      "de-DE": "https://beatzucker.de/impressum",
      en: "https://beatzucker.de/legal-notice",
      "x-default": "https://beatzucker.de/impressum",
    },
  },
};

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum" activePage="impressum">
      <div className="legal-section">
        <h2>Angaben gem. § 5 DDG</h2>
        <p>
          Michael Clas<br />
          Plaidter Str. 31<br />
          56648 Saffig<br />
          Deutschland
        </p>
      </div>

      <div className="legal-section">
        <h2>Kontakt</h2>
        <p>
          Telefon: +49 2632 4966999<br />
          E-Mail: <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
        </p>
      </div>

      <div className="legal-section">
        <h2>Umsatzsteuer-Identifikationsnummer</h2>
        <p>
          USt-IdNr. gemäß § 27a UStG: <strong style={{ color: "var(--text-primary)" }}>DE353324466</strong>
        </p>
      </div>

      <div className="legal-section">
        <h2>Verantwortlich i.S.d. § 18 Abs. 2 MStV</h2>
        <p>
          Michael Clas<br />
          Plaidter Str. 31, 56648 Saffig
        </p>
      </div>

      <div className="legal-section">
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </div>

      <div className="legal-section">
        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen.
        </p>
      </div>

      <div className="legal-section">
        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich.
        </p>
      </div>

      <div className="legal-section">
        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
          dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
          der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
          Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </div>

      <div className="legal-meta">
        Stand: März 2026 · Beatzucker · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
      </div>
    </LegalLayout>
  );
}
