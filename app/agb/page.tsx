import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "AGB – UpMaDo",
  description: "AGB von UpMaDo: Nutzungsbedingungen für den kostenlosen KI-Audio-Mastering-Dienst — Leistungsumfang, faire Nutzung, Urheberrecht und Haftung.",
  alternates: { canonical: "https://upmado.com/agb" },
};

const SECTIONS = [
  { id: "geltungsbereich",   label: "§ 1 Geltungsbereich" },
  { id: "leistung",          label: "§ 2 Leistungsbeschreibung" },
  { id: "konto",             label: "§ 3 Nutzerkonto" },
  { id: "fair-use",          label: "§ 4 Faire Nutzung" },
  { id: "urheberrecht",      label: "§ 5 Urheberrecht" },
  { id: "datenschutz",       label: "§ 6 Datenschutz" },
  { id: "haftung",           label: "§ 7 Haftung" },
  { id: "recht",             label: "§ 8 Geltendes Recht" },
  { id: "schluss",           label: "§ 9 Schlussbestimmungen" },
];

export default function AGBPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen" activePage="agb" sections={SECTIONS}>

      <div className="legal-section" id="geltungsbereich">
        <h2>§ 1 Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Nutzer des kostenlosen
          Online-Mastering-Dienstes von Michael Clas, UpMaDo, Plaidter Str. 31, 56648 Saffig
          (nachfolgend „Anbieter") unter upmado.com (nachfolgend „Nutzer"). Mit der Registrierung
          oder der Nutzung des Dienstes stimmt der Nutzer diesen AGB zu. Entgegenstehende oder
          abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, der Anbieter
          stimmt ihrer Geltung ausdrücklich schriftlich zu.
        </p>
      </div>

      <div className="legal-section" id="leistung">
        <h2>§ 2 Leistungsbeschreibung</h2>
        <p>
          UpMaDo bietet einen automatisierten, kostenlosen Audio-Mastering-Dienst an. Der Dienst
          umfasst die Verarbeitung von Audiodateien durch eine mehrstufige DSP-Signalkette (u. a.
          EQ, Mehrband-Kompression, Stereo-Optimierung, Sättigung, LUFS-Normalisierung,
          True-Peak-Limiting, automatische Parameterauswahl und optionales Referenz-Track-Matching)
          sowie die zeitlich befristete Bereitstellung aller Export-Formate (WAV 32-bit Float,
          WAV 24-bit, WAV 16-bit, FLAC, MP3 320, MP3 128, AAC 256). Der Anbieter stellt die
          gemasterte Ausgabedatei nach Abschluss der Verarbeitung zum Download bereit. Das
          Download-Fenster beträgt <strong style={{ color: "var(--text-primary)" }}>24 Stunden</strong>.
          Nach Ablauf dieser Frist wird die Datei automatisch und unwiederbringlich vom Server gelöscht.
        </p>
        <p>
          Sämtliche Funktionen sind für alle Nutzer kostenlos zugänglich. Es besteht kein
          entgeltliches Vertragsverhältnis. Der Anbieter behält sich vor, den Dienst jederzeit
          zu ändern, zu erweitern oder einzustellen, sofern dies dem Nutzer mit angemessener
          Frist mitgeteilt wird.
        </p>
      </div>

      <div className="legal-section" id="konto">
        <h2>§ 3 Nutzerkonto</h2>
        <p>
          Die Nutzung des Dienstes setzt eine kostenlose Registrierung voraus. Der Nutzer ist
          verpflichtet, wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu
          halten. Die Zugangsdaten sind vertraulich zu behandeln und vor unbefugtem Zugriff zu
          schützen. Der Nutzer haftet für alle Aktivitäten, die unter seinem Konto stattfinden,
          sofern er den Missbrauch nicht zu vertreten hat.
        </p>
        <p>
          Gemasterte Audiodateien werden nicht dauerhaft im Nutzerkonto gespeichert (→ § 6). Im
          Nutzerkonto werden ausschließlich Metadaten des Mastering-Verlaufs gespeichert:
          Dateiname, Erstellungsdatum, gewählte Plattform, LUFS-Messwerte und
          Mastering-Parameter. Die Originalaudio- und Ausgabedateien selbst werden nach Ablauf
          des Download-Fensters (24 Stunden) vom Server gelöscht.
        </p>
        <p>
          Der Anbieter behält sich vor, Konten bei schwerwiegenden oder wiederholten Verstößen
          gegen diese AGB zu sperren oder zu löschen.
        </p>
      </div>

      <div className="legal-section" id="fair-use">
        <h2>§ 4 Faire Nutzung</h2>
        <p>
          Um eine stabile und faire Nutzung für alle sicherzustellen, gilt pro Nutzerkonto ein
          tägliches Limit an Mastering-Vorgängen. Dieses Limit dient ausschließlich dem Schutz
          vor Missbrauch und Serverüberlastung und stellt keine Vorstufe zu einem kostenpflichtigen
          Angebot dar. Der Anbieter kann das Limit bei Bedarf anpassen.
        </p>
      </div>

      <div className="legal-section" id="urheberrecht">
        <h2>§ 5 Nutzungsrechte und Urheberrecht</h2>
        <p>
          Der Nutzer versichert, dass er über alle notwendigen Rechte an den hochgeladenen
          Audiodateien verfügt und durch die Nutzung des Dienstes keine Rechte Dritter verletzt
          werden. Die durch UpMaDo erstellten gemasterten Audiodateien sind für den persönlichen
          und kommerziellen Gebrauch des Nutzers bestimmt. UpMaDo beansprucht kein Urheberrecht
          an den verarbeiteten Dateien. Der Nutzer stellt den Anbieter von sämtlichen Ansprüchen
          Dritter frei, die aus einer Verletzung von Rechten Dritter durch die vom Nutzer
          hochgeladenen Inhalte entstehen.
        </p>
      </div>

      <div className="legal-section" id="datenschutz">
        <h2>§ 6 Datenschutz und Datenspeicherung</h2>
        <p>
          Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer{" "}
          <a href="/datenschutz">Datenschutzerklärung</a>.
        </p>
        <p>
          Hochgeladene Original-Audiodateien werden unmittelbar nach Abschluss der Verarbeitung
          vom Server gelöscht (maximal 60 Minuten). Gemasterte Ausgabedateien stehen
          <strong style={{ color: "var(--text-primary)" }}> 24 Stunden</strong> nach
          Verarbeitungsabschluss zum Download bereit und werden anschließend automatisch gelöscht. Es wird keine
          permanente Audio-Bibliothek oder dauerhaftes Dateiarchiv geführt. Im Nutzerkonto
          werden ausschließlich Mastering-Metadaten (Dateiname, Datum, Parameter,
          Analyseergebnisse) gespeichert, kein Audiomaterial.
        </p>
      </div>

      <div className="legal-section" id="haftung">
        <h2>§ 7 Haftungsbeschränkung</h2>
        <p>
          Der Anbieter haftet nur für Schäden, die auf vorsätzlichem oder grob fahrlässigem
          Verhalten beruhen. Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung
          einer wesentlichen Vertragspflicht (Kardinalpflicht), beschränkt auf den vorhersehbaren,
          vertragstypischen Schaden. Eine Haftung für indirekte Schäden, entgangenen Gewinn oder
          den Verlust von Audiodaten ist — soweit gesetzlich zulässig — ausgeschlossen.
        </p>
        <p>
          Der Anbieter übernimmt keine Garantie für eine ununterbrochene Verfügbarkeit des
          Dienstes. Für die Qualität der Bearbeitung durch den automatisierten Dienst wird keine
          Gewähr für ein bestimmtes künstlerisches Ergebnis übernommen. Nutzer sind ausdrücklich
          darauf hingewiesen, dass gemasterte Dateien innerhalb des Download-Fensters
          (24 Stunden) heruntergeladen werden müssen.
        </p>
      </div>

      <div className="legal-section" id="recht">
        <h2>§ 8 Geltendes Recht und Gerichtsstand</h2>
        <p>
          Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des
          UN-Kaufrechts (CISG). Als Gerichtsstand wird — soweit gesetzlich zulässig — Koblenz
          vereinbart. Für Verbraucher gilt abweichend das Recht des Mitgliedstaates der
          Europäischen Union, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, sofern
          es sich um zwingende Verbraucherschutzvorschriften handelt.
        </p>
      </div>

      <div className="legal-section" id="schluss">
        <h2>§ 9 Schlussbestimmungen</h2>
        <p>
          Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die
          Wirksamkeit der übrigen Bestimmungen davon unberührt. Der Anbieter behält sich das
          Recht vor, diese AGB mit angemessener Frist (mindestens 30 Tage) zu ändern.
          Änderungen werden dem Nutzer per E-Mail mitgeteilt. Widerspricht der Nutzer nicht
          innerhalb der Frist, gelten die neuen AGB als akzeptiert. Ausgenommen von dieser
          Zustimmungsfiktion sind wesentliche Einschränkungen der Leistungen; für diese ist
          stets die ausdrückliche gesonderte Zustimmung des Nutzers erforderlich.
        </p>
      </div>

      <div className="legal-meta">
        Stand: März 2026 · UpMaDo · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
      </div>
    </LegalLayout>
  );
}
