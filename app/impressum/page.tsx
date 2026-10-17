import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = pageMetadata({
  title: { absolute: "Impressum – Beatzucker" },
  description: "Impressum und Anbieterkennzeichnung von Beatzucker gemäß § 5 DDG mit Anbieter, Kontakt und rechtlichen Hinweisen.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://beatzucker.de/impressum",
    languages: {
      "de-DE": "https://beatzucker.de/impressum",
      en: "https://beatzucker.de/legal-notice",
      "x-default": "https://beatzucker.de/impressum",
    },
  },
});

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
        <h2>Kontaktstellen nach dem Digital Services Act</h2>
        <p>
          Kontaktstelle für Nutzer gemäß Art. 12 DSA und für Behörden gemäß Art. 11 DSA: {" "}
          <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>. Die Kommunikation ist auf
          Deutsch und Englisch möglich. Bitte kennzeichnen Sie Behördenanfragen im Betreff als
          „DSA-Behördenkontakt“ und Meldungen zu einem konkreten Upload als „Inhaltsmeldung“.
        </p>
      </div>

      <div className="legal-section">
        <h2>Haftung für Inhalte</h2>
        <p>
          Für eigene Inhalte gelten die allgemeinen Gesetze. Soweit Beatzucker vorübergehend
          Informationen im Auftrag eines Nutzers speichert, richten sich mögliche
          Haftungsprivilegien nach den Art. 4 bis 8 der Verordnung (EU) 2022/2065 (Digital
          Services Act) in Verbindung mit § 7 DDG. Verpflichtungen aufgrund gerichtlicher oder
          behördlicher Anordnungen bleiben unberührt.
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
        Stand: August 2026 · Beatzucker · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
      </div>
    </LegalLayout>
  );
}
