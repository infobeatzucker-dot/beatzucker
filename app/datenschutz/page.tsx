import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – UpMaDo",
  description: "Wie UpMaDo mit deinen Daten umgeht: automatische Löschung von Audiodateien, keine Weitergabe an Dritte, DSGVO-konform gehostet in der EU.",
  alternates: { canonical: "https://upmado.com/datenschutz" },
};

const SECTIONS = [
  { id: "verantwortlicher",  label: "1. Verantwortlicher" },
  { id: "audiodaten",        label: "2.1 Audio-Dateien" },
  { id: "nutzungsdaten",     label: "2.2 Nutzungsdaten" },
  { id: "serverlogs",        label: "2.3 Server-Logs" },
  { id: "kontodaten",        label: "2.4 Konto-Daten" },
  { id: "hosting",           label: "2.5 Hosting" },
  { id: "localstorage",      label: "3. LocalStorage" },
  { id: "rechte",            label: "4. Ihre Rechte" },
  { id: "automatisierung",   label: "5. Keine Automatisierung" },
  { id: "sicherheit",        label: "6. Datensicherheit" },
];

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung" activePage="datenschutz" sections={SECTIONS}>

      <div className="legal-section" id="verantwortlicher">
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlicher im Sinne der DSGVO ist:<br />
          Michael Clas · UpMaDo<br />
          Plaidter Str. 31 · 56648 Saffig · Deutschland<br />
          E-Mail: <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
        </p>
      </div>

      <div className="legal-section" id="audiodaten">
        <h2>2.1 Audio-Dateien</h2>
        <p>
          Hochgeladene Original-Audiodateien werden ausschließlich zur Verarbeitung des
          Mastering-Auftrags verwendet und unmittelbar nach Abschluss der Verarbeitung vom
          Server gelöscht (spätestens nach 60 Minuten).
        </p>
        <p>
          Gemasterte Ausgabedateien werden nach Abschluss der Verarbeitung für
          <strong style={{ color: "var(--text-primary)" }}> 24 Stunden</strong>
          auf dem Server vorgehalten, um den Download zu ermöglichen. Nach Ablauf dieser Frist
          werden die Dateien automatisch und dauerhaft gelöscht. Es wird keine permanente
          Audio-Bibliothek oder dauerhaftes Dateiarchiv geführt.
        </p>
        <p>
          Keine dauerhafte Speicherung, keine Weitergabe, keine Analyse der Audioinhalte.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
        </p>
      </div>

      <div className="legal-section" id="nutzungsdaten">
        <h2>2.2 Nutzungsdaten (Fair-Use)</h2>
        <p>
          Zur Durchsetzung etwaiger Nutzungslimits (Masters pro Tag / Monat) werden
          anonymisierte Zähler in der Datenbank gespeichert. Diese Zähler werden
          ausschließlich zur Quota-Verwaltung verwendet und nicht mit personenbezogenen
          Daten verknüpft. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse).
        </p>
      </div>

      <div className="legal-section" id="serverlogs">
        <h2>2.3 Server-Logs</h2>
        <p>
          Automatisch protokolliert: IP-Adresse, Datum/Uhrzeit, aufgerufene URL,
          HTTP-Status, übertragene Datenmenge. Speicherdauer: 7 Tage, dann automatische
          Löschung. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse — Betriebssicherheit).
        </p>
      </div>

      <div className="legal-section" id="kontodaten">
        <h2>2.4 Kontodaten</h2>
        <p>
          Für registrierte Nutzer werden folgende Daten gespeichert:
        </p>
        <ul>
          <li>E-Mail-Adresse (Pflichtangabe zur Kontoerstellung)</li>
          <li>Name (optional)</li>
          <li>Tägliche Nutzungszähler (Fair-Use-Limit)</li>
          <li>
            <strong style={{ color: "var(--text-primary)" }}>Mastering-Verlauf (Metadaten):</strong>{" "}
            Dateiname, Datum, gewählte Plattform, Mastering-Intensität, LUFS-Messwerte vor/nach
            der Verarbeitung, Mastering-Parameter — ausdrücklich <em>kein</em> Audiomaterial
          </li>
        </ul>
        <p>
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          Speicherdauer: bis zur Löschung des Nutzerkontos.
        </p>
      </div>

      <div className="legal-section" id="hosting">
        <h2>2.5 Hosting (Auftragsverarbeiter)</h2>
        <p>
          Diese Website wird auf Servern der{" "}
          <strong style={{ color: "var(--text-primary)" }}>DomainFactory GmbH</strong>{" "}
          (df.eu), Oskar-Messter-Str. 33, 85737 Ismaning, Deutschland gehostet.
          DomainFactory ist Auftragsverarbeiter gemäß Art. 28 DSGVO; ein entsprechender
          Auftragsverarbeitungsvertrag (AVV) ist abgeschlossen. Die Server befinden
          sich innerhalb der Europäischen Union. Eine Übertragung in Drittländer
          findet durch den Hoster nicht statt.
        </p>
        <p>
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse —
          zuverlässiger Betrieb der Website). Datenschutzrichtlinie DomainFactory:{" "}
          <a href="https://www.df.eu/de/datenschutz/" target="_blank" rel="noopener noreferrer">
            df.eu/de/datenschutz
          </a>
        </p>
      </div>

      <div className="legal-section" id="localstorage">
        <h2>3. Lokaler Speicher (LocalStorage)</h2>
        <p>
          Diese Website verwendet ausschließlich technisch notwendigen lokalen Speicher.
          Keine Tracking-Cookies, keine Werbe-Cookies, kein Analytics. Gespeichert werden:
        </p>
        <ul>
          <li>Benutzereinstellungen (Plattform, Preset, Intensity, Sprachpräferenz) — nur lokal, kein Upload</li>
          <li>Hinweis-Status (Cookie-Banner-Bestätigung)</li>
        </ul>
        <p>
          Die technisch notwendige Speicherung bedarf keiner Einwilligung
          (§ 25 Abs. 2 Nr. 2 TDDDG). Alle lokalen Daten verbleiben ausschließlich
          auf Ihrem Gerät.
        </p>
      </div>

      <div className="legal-section" id="rechte">
        <h2>4. Ihre Rechte (Art. 15–22 DSGVO)</h2>
        <ul>
          <li><strong>Auskunft</strong> (Art. 15) — Welche Daten wir über Sie gespeichert haben</li>
          <li><strong>Berichtigung</strong> (Art. 16) — Korrektur unrichtiger Daten</li>
          <li><strong>Löschung</strong> (Art. 17) — „Recht auf Vergessenwerden"</li>
          <li><strong>Einschränkung</strong> (Art. 18) — Einschränkung der Verarbeitung</li>
          <li><strong>Datenübertragbarkeit</strong> (Art. 20) — Export Ihrer Daten in maschinenlesbarem Format</li>
          <li><strong>Widerspruch</strong> (Art. 21) — Gegen Verarbeitung auf Basis berechtigter Interessen</li>
        </ul>
        <p>
          Anfragen richten Sie bitte an:{" "}
          <a href="mailto:info@re-beatz.com">info@re-beatz.com</a><br />
          Beschwerden können Sie an die Aufsichtsbehörde richten:<br />
          Landesbeauftragter für Datenschutz und Informationsfreiheit Rheinland-Pfalz,{" "}
          <a href="https://www.datenschutz.rlp.de" target="_blank" rel="noopener noreferrer">datenschutz.rlp.de</a>
        </p>
      </div>

      <div className="legal-section" id="automatisierung">
        <h2>5. Keine automatisierte Entscheidungsfindung</h2>
        <p>
          Eine automatisierte Entscheidungsfindung oder Profiling im Sinne des Art. 22 DSGVO
          findet nicht statt. Der Mastering-Dienst verarbeitet Audiodateien rein technisch
          (Signalverarbeitung und KI-gestützte Parameterauswahl) und trifft keine Entscheidungen
          mit rechtlicher oder ähnlich bedeutsamer Wirkung auf betroffene Personen.
        </p>
      </div>

      <div className="legal-section" id="sicherheit">
        <h2>6. Datensicherheit & Speicherdauer</h2>
        <p>
          Alle Datenübertragungen sind durch TLS/HTTPS verschlüsselt. Speicherdauer im Überblick:
        </p>
        <ul>
          <li><strong>Upload-Audiodatei:</strong> sofortige Löschung nach Verarbeitung (max. 60 Min.)</li>
          <li><strong>Gemasterte Ausgabedatei:</strong> 24 Stunden nach Verarbeitungsabschluss</li>
          <li><strong>Server-Logs:</strong> 7 Tage</li>
          <li><strong>Konto- und Mastering-Metadaten:</strong> bis zur Konto-Löschung</li>
        </ul>
        <p>
          Zur EU-Streitbeilegung: Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{" "}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>. Wir sind nicht verpflichtet und nicht bereit, an einem
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </div>

      <div className="legal-meta">
        Stand: März 2026 · UpMaDo · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
      </div>
    </LegalLayout>
  );
}
