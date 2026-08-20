import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: { absolute: "Cancellation Policy – Beatzucker" },
  description: "Cancellation information for Beatzucker's free online audio mastering service.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://beatzucker.de/cancellation-policy",
    languages: {
      "de-DE": "https://beatzucker.de/widerruf",
      en: "https://beatzucker.de/cancellation-policy",
      "x-default": "https://beatzucker.de/widerruf",
    },
  },
};

const SECTIONS = [{ id: "free-service", label: "No cancellation right applies" }];

export default function CancellationPolicyPage() {
  return (
    <LegalLayout title="Cancellation Policy" activePage="cancellation-policy" sections={SECTIONS} lang="en">
      <div className="legal-section" style={{ borderLeft: "3px solid var(--accent-gold)", paddingLeft: "1rem" }}>
        <p>This English translation is provided for convenience. The German <a href="/widerruf">Widerrufsbelehrung</a> remains the authoritative version.</p>
      </div>
      <div className="legal-section" id="free-service">
        <h2>No statutory cancellation right applies</h2>
        <p>Beatzucker is a completely free service. Its use does not establish a paid contractual relationship, so the statutory cancellation right described in Section 355 of the German Civil Code does not apply. No payments are made that could be refunded.</p>
      </div>
      <div className="legal-meta">As of August 2026 · Beatzucker · <a href="mailto:info@re-beatz.com">info@re-beatz.com</a></div>
    </LegalLayout>
  );
}
