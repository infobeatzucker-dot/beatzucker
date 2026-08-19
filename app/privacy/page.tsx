import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy – Beatzucker" },
  description: "How Beatzucker handles your data: automatic deletion of audio files, no sharing with third parties, GDPR-compliant hosting in the EU.",
  alternates: { canonical: "https://beatzucker.de/privacy" },
};

const SECTIONS = [
  { id: "controller",    label: "1. Data Controller" },
  { id: "audiodata",     label: "2.1 Audio Files" },
  { id: "usagedata",     label: "2.2 Usage Data" },
  { id: "serverlogs",    label: "2.3 Server Logs" },
  { id: "accountdata",   label: "2.4 Account Data" },
  { id: "hosting",       label: "2.5 Hosting" },
  { id: "localstorage",  label: "3. Local Storage" },
  { id: "rights",        label: "4. Your Rights" },
  { id: "automation",    label: "5. No Automated Decisions" },
  { id: "security",      label: "6. Data Security" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" activePage="privacy" sections={SECTIONS} lang="en">

      <div className="legal-section" id="controller">
        <h2>1. Data Controller</h2>
        <p>
          The controller within the meaning of the GDPR is:<br />
          Michael Clas · Beatzucker<br />
          Plaidter Str. 31 · 56648 Saffig · Germany<br />
          Email: <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
        </p>
      </div>

      <div className="legal-section" id="audiodata">
        <h2>2.1 Audio Files</h2>
        <p>
          Uploaded original audio files are used exclusively to process the mastering job and
          are deleted from the server immediately after processing is complete
          (at most within 60 minutes).
        </p>
        <p>
          Mastered output files are retained on the server for
          <strong style={{ color: "var(--text-primary)" }}> 24 hours</strong>
          after processing to allow download. After this period, files are automatically and
          permanently deleted. No permanent audio library or archive is maintained.
        </p>
        <p>
          No permanent storage, no sharing, no analysis of audio content.
          Legal basis: Art. 6(1)(b) GDPR (performance of contract).
        </p>
      </div>

      <div className="legal-section" id="usagedata">
        <h2>2.2 Usage Data (Fair Use)</h2>
        <p>
          To enforce usage limits (masters per day / month), anonymised counters are stored in
          the database. These counters are used solely for quota management and are not linked
          to personal data. Legal basis: Art. 6(1)(f) GDPR (legitimate interest).
        </p>
      </div>

      <div className="legal-section" id="serverlogs">
        <h2>2.3 Server Logs</h2>
        <p>
          Automatically logged: IP address, date/time, requested URL, HTTP status, bytes
          transferred. Retention period: 7 days, then automatically deleted.
          Legal basis: Art. 6(1)(f) GDPR (legitimate interest — operational security).
        </p>
      </div>

      <div className="legal-section" id="accountdata">
        <h2>2.4 Account Data</h2>
        <p>
          For registered users, the following data is stored:
        </p>
        <ul>
          <li>Email address (required for account creation)</li>
          <li>Name (optional)</li>
          <li>Daily usage counters (fair-use limit)</li>
          <li>
            <strong style={{ color: "var(--text-primary)" }}>Mastering history (metadata):</strong>{" "}
            file name, date, selected platform, mastering intensity, LUFS measurements before/after
            processing, mastering parameters — explicitly <em>no</em> audio content
          </li>
        </ul>
        <p>
          Legal basis: Art. 6(1)(b) GDPR (performance of contract).
          Retention: until account deletion.
        </p>
      </div>

      <div className="legal-section" id="hosting">
        <h2>2.5 Hosting (Data Processor)</h2>
        <p>
          This website is hosted on servers of{" "}
          <strong style={{ color: "var(--text-primary)" }}>DomainFactory GmbH</strong>{" "}
          (df.eu), Oskar-Messter-Str. 33, 85737 Ismaning, Germany. DomainFactory acts as
          a data processor under Art. 28 GDPR; a Data Processing Agreement (DPA) is in
          place. The servers are located within the European Union. No transfer to third
          countries takes place through the hosting provider.
        </p>
        <p>
          Legal basis: Art. 6(1)(f) GDPR (legitimate interest — reliable operation of the
          website). DomainFactory Privacy Policy:{" "}
          <a href="https://www.df.eu/de/datenschutz/" target="_blank" rel="noopener noreferrer">
            df.eu/de/datenschutz
          </a>
        </p>
      </div>

      <div className="legal-section" id="localstorage">
        <h2>3. Local Storage</h2>
        <p>
          This website uses only technically necessary local storage. No tracking cookies,
          no advertising cookies, no analytics. Stored locally:
        </p>
        <ul>
          <li>User preferences (platform, preset, intensity, language) — local only, not uploaded</li>
          <li>Notice status (cookie banner confirmation)</li>
        </ul>
        <p>
          Technically necessary storage does not require consent (§ 25(2)(2) TDDDG).
          All local data remains exclusively on your device.
        </p>
      </div>

      <div className="legal-section" id="rights">
        <h2>4. Your Rights (Art. 15–22 GDPR)</h2>
        <ul>
          <li><strong>Access</strong> (Art. 15) — What data we hold about you</li>
          <li><strong>Rectification</strong> (Art. 16) — Correction of inaccurate data</li>
          <li><strong>Erasure</strong> (Art. 17) — "Right to be forgotten"</li>
          <li><strong>Restriction</strong> (Art. 18) — Restriction of processing</li>
          <li><strong>Data portability</strong> (Art. 20) — Export your data in machine-readable format via your <a href="/account">account page</a></li>
          <li><strong>Objection</strong> (Art. 21) — Against processing based on legitimate interests</li>
        </ul>
        <p>
          To exercise your rights, contact:{" "}
          <a href="mailto:info@re-beatz.com">info@re-beatz.com</a><br />
          You may also lodge a complaint with a supervisory authority. For users in Germany:<br />
          Landesbeauftragter für Datenschutz und Informationsfreiheit Rheinland-Pfalz,{" "}
          <a href="https://www.datenschutz.rlp.de" target="_blank" rel="noopener noreferrer">datenschutz.rlp.de</a>
        </p>
      </div>

      <div className="legal-section" id="automation">
        <h2>5. No Automated Decision-Making</h2>
        <p>
          No automated decision-making or profiling within the meaning of Art. 22 GDPR takes
          place. The mastering service processes audio files purely technically (signal processing
          and measurement-based adaptive parameter selection) and makes no decisions with legal or similarly
          significant effects on individuals.
        </p>
      </div>

      <div className="legal-section" id="security">
        <h2>6. Data Security &amp; Retention Summary</h2>
        <p>
          All data transmissions are encrypted via TLS/HTTPS. Retention periods at a glance:
        </p>
        <ul>
          <li><strong>Uploaded audio file:</strong> deleted immediately after processing (max. 60 min.)</li>
          <li><strong>Mastered output file:</strong> 24 hours after processing completion</li>
          <li><strong>Server logs:</strong> 7 days</li>
          <li><strong>Account and mastering metadata:</strong> until account deletion</li>
        </ul>
        <p>
          EU Online Dispute Resolution: The European Commission provides an ODR platform at{" "}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>. We are neither obliged nor willing to participate in dispute resolution
          proceedings before a consumer arbitration board.
        </p>
      </div>

      <div className="legal-meta">
        As of March 2026 · Beatzucker · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
      </div>
    </LegalLayout>
  );
}
