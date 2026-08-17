import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service – Beatzucker",
  description: "Terms of Service for Beatzucker's free AI audio mastering service — usage terms, fair use limits, copyright, and liability.",
  alternates: { canonical: "https://beatzucker.de/terms" },
};

const SECTIONS = [
  { id: "scope",       label: "§ 1 Scope" },
  { id: "services",    label: "§ 2 Services" },
  { id: "account",     label: "§ 3 User Account" },
  { id: "fair-use",    label: "§ 4 Fair Use" },
  { id: "copyright",   label: "§ 5 Intellectual Property" },
  { id: "privacy",     label: "§ 6 Privacy" },
  { id: "liability",   label: "§ 7 Liability" },
  { id: "law",         label: "§ 8 Governing Law" },
  { id: "final",       label: "§ 9 Final Provisions" },
];

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" activePage="terms" sections={SECTIONS} lang="en">

      <div className="legal-section" id="scope">
        <h2>§ 1 Scope</h2>
        <p>
          These Terms of Service govern all users of the free online mastering service operated
          by Michael Clas, Beatzucker, Plaidter Str. 31, 56648 Saffig, Germany (hereinafter
          "Provider") at beatzucker.de (hereinafter "User"). By registering or using the service,
          the User agrees to these Terms. Conflicting or deviating terms of the User shall not
          be recognised unless the Provider has expressly agreed to them in writing.
        </p>
      </div>

      <div className="legal-section" id="services">
        <h2>§ 2 Service Description</h2>
        <p>
          Beatzucker provides an automated, free audio mastering service. The service includes
          processing audio files through a multi-stage DSP signal chain (EQ, multiband
          compression, stereo optimisation, saturation, LUFS normalisation, true-peak limiting,
          automatic parameter selection and optional reference-track matching) and the temporary
          provision of all export formats (WAV 32-bit Float, WAV 24-bit, WAV 16-bit, FLAC,
          MP3 320, MP3 128, AAC 256). The Provider makes the mastered output file available for
          download after processing is complete. The download window is
          <strong style={{ color: "var(--text-primary)" }}> 24 hours</strong>. After this period,
          the file is automatically and permanently deleted from the server.
        </p>
        <p>
          All features are free of charge for every User. No paid contract is formed. The
          Provider reserves the right to modify, expand or discontinue the service at any time,
          provided adequate notice is given to the User.
        </p>
      </div>

      <div className="legal-section" id="account">
        <h2>§ 3 User Account</h2>
        <p>
          Use of the service requires free registration. The User must provide truthful and
          complete information and keep it up to date. Login credentials must be kept confidential
          and protected from unauthorised access. The User is liable for all activities that occur
          under their account, unless they are not responsible for the misuse.
        </p>
        <p>
          Mastered audio files are not stored permanently in the user account (→ § 6). Only
          mastering metadata is stored: file name, creation date, selected platform, LUFS
          measurements and mastering parameters. Original audio and output files are deleted
          after the download window expires (24 hours).
        </p>
        <p>
          The Provider reserves the right to suspend or delete accounts in the event of serious
          or repeated violations of these Terms.
        </p>
      </div>

      <div className="legal-section" id="fair-use">
        <h2>§ 4 Fair Use</h2>
        <p>
          To keep the service stable and fair for everyone, each account is subject to a daily
          limit on the number of mastering operations. This limit exists solely to protect
          against abuse and server overload and does not constitute a step toward any paid
          offering. The Provider may adjust the limit as needed.
        </p>
      </div>

      <div className="legal-section" id="copyright">
        <h2>§ 5 Intellectual Property</h2>
        <p>
          The User warrants that they hold all necessary rights to the uploaded audio files and
          that use of the service does not infringe any third-party rights. Mastered audio files
          created by Beatzucker are intended for the User's personal and commercial use. Beatzucker
          claims no copyright over processed files. The User shall indemnify the Provider against
          all third-party claims arising from infringement of third-party rights by content
          uploaded by the User.
        </p>
      </div>

      <div className="legal-section" id="privacy">
        <h2>§ 6 Privacy and Data Storage</h2>
        <p>
          Personal data is processed in accordance with our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
        <p>
          Uploaded original audio files are deleted immediately after processing is complete
          (maximum 60 minutes). Mastered output files are available for download for
          <strong style={{ color: "var(--text-primary)" }}> 24 hours</strong> after processing
          and are then automatically deleted. No permanent audio library or archive is maintained.
          Only mastering metadata (file name, date, parameters, analysis results) is stored in
          user accounts — no audio content.
        </p>
      </div>

      <div className="legal-section" id="liability">
        <h2>§ 7 Limitation of Liability</h2>
        <p>
          The Provider is only liable for damages caused by intentional or grossly negligent
          conduct. In cases of simple negligence, the Provider is only liable for breach of a
          material contractual obligation (cardinal obligation), limited to foreseeable,
          contract-typical damage. Liability for indirect damages, loss of profit or loss of
          audio data is excluded to the extent permitted by law.
        </p>
        <p>
          The Provider does not guarantee uninterrupted availability of the service. No guarantee
          is given for a specific artistic result from the automated service. Users are expressly
          advised that mastered files must be downloaded within the download window (24 hours).
        </p>
      </div>

      <div className="legal-section" id="law">
        <h2>§ 8 Governing Law and Jurisdiction</h2>
        <p>
          These Terms are governed exclusively by the laws of the Federal Republic of Germany,
          excluding the UN Convention on Contracts for the International Sale of Goods (CISG).
          The place of jurisdiction is Koblenz, Germany, to the extent permitted by law.
          For consumers in EU member states, mandatory consumer protection provisions of the
          consumer's country of habitual residence apply.
        </p>
      </div>

      <div className="legal-section" id="final">
        <h2>§ 9 Final Provisions</h2>
        <p>
          Should any individual provision of these Terms be or become invalid, the validity of
          the remaining provisions shall not be affected. The Provider reserves the right to
          amend these Terms with reasonable notice (at least 30 days). Changes will be
          communicated to the User by email. If the User does not object within the notice
          period, the new Terms shall be deemed accepted. Material restrictions of the services
          are excluded from this implied consent and always require the User's express separate
          consent.
        </p>
      </div>

      <div className="legal-meta">
        As of March 2026 · Beatzucker · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a>
      </div>
    </LegalLayout>
  );
}
