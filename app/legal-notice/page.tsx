import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: { absolute: "Legal Notice – Beatzucker" },
  description: "Provider identification and legal information for the Beatzucker online audio mastering service.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://beatzucker.de/legal-notice",
    languages: {
      "de-DE": "https://beatzucker.de/impressum",
      en: "https://beatzucker.de/legal-notice",
      "x-default": "https://beatzucker.de/impressum",
    },
  },
};

export default function LegalNoticePage() {
  return (
    <LegalLayout title="Legal Notice" activePage="legal-notice" lang="en">
      <div className="legal-section" style={{ borderLeft: "3px solid var(--accent-gold)", paddingLeft: "1rem" }}>
        <p>This English translation is provided for convenience. The German <a href="/impressum">Impressum</a> remains the authoritative version.</p>
      </div>
      <div className="legal-section">
        <h2>Information pursuant to Section 5 DDG</h2>
        <p>Michael Clas<br />Plaidter Str. 31<br />56648 Saffig<br />Germany</p>
      </div>
      <div className="legal-section">
        <h2>Contact</h2>
        <p>Phone: +49 2632 4966999<br />Email: <a href="mailto:info@re-beatz.com">info@re-beatz.com</a></p>
      </div>
      <div className="legal-section">
        <h2>VAT Identification Number</h2>
        <p>VAT ID pursuant to Section 27a of the German VAT Act: <strong style={{ color: "var(--text-primary)" }}>DE353324466</strong></p>
      </div>
      <div className="legal-section">
        <h2>Responsible for editorial content</h2>
        <p>Michael Clas<br />Plaidter Str. 31, 56648 Saffig</p>
      </div>
      <div className="legal-section">
        <h2>Consumer Dispute Resolution</h2>
        <p>We are neither obliged nor willing to participate in dispute resolution proceedings before a consumer arbitration board.</p>
      </div>
      <div className="legal-section">
        <h2>Liability for Content</h2>
        <p>As a service provider, we are responsible for our own content on these pages under general law. However, we are not obliged to monitor transmitted or stored third-party information or investigate circumstances indicating unlawful activity.</p>
      </div>
      <div className="legal-section">
        <h2>Liability for Links</h2>
        <p>Our service contains links to external third-party websites whose content we cannot control. The respective provider or operator is always responsible for the content of linked pages.</p>
      </div>
      <div className="legal-section">
        <h2>Copyright</h2>
        <p>Content and works created by the site operator are subject to German copyright law. Reproduction, editing, distribution or exploitation beyond the limits of copyright law requires the prior written consent of the respective author or creator.</p>
      </div>
      <div className="legal-meta">As of August 2026 · Beatzucker · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a></div>
    </LegalLayout>
  );
}
