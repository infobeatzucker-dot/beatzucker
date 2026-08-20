import Link from "next/link";
import { Lock } from "lucide-react";
import CookieReopenButton from "./CookieReopenButton";
import DonateButton from "./DonateButton";
import type { Lang } from "@/lib/types/mastering";

export default function Footer({ lang = "de" }: { lang?: Lang }) {
  const navigation = lang === "de"
    ? [
        ["/features", "Funktionen"], ["/help", "Hilfe"], ["/ressourcen", "Wissen"],
        ["/impressum", "Impressum"], ["/datenschutz", "Datenschutz"], ["/agb", "AGB"],
        ["/widerruf", "Widerruf"],
      ]
    : [
        ["/features", "Features"], ["/help", "Help"], ["/en/knowledge", "Knowledge"],
        ["/impressum", "Legal notice"], ["/privacy", "Privacy"], ["/terms", "Terms"],
        ["/widerruf", "Cancellation policy"],
      ];
  return (
    <footer
      className="border-t py-8 px-4"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        background: "var(--bg-secondary)",
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">
            <span style={{ color: "var(--accent-purple)" }}>Beat</span>
            <span style={{ color: "var(--accent-cyan)" }}>zucker</span>
          </span>
        </div>

        {/* Legal links */}
        <div className="flex gap-5 text-xs flex-wrap justify-center" style={{ color: "var(--text-muted)" }}>
          <span style={{ color: "var(--accent-gold)" }}><DonateButton variant="footer" lang={lang} /></span>
          {navigation.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>{label}</Link>
          ))}
          <span style={{ color: "inherit" }}><CookieReopenButton lang={lang} /></span>
        </div>

        {/* Privacy badge */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {lang === "de" ? "Adaptives Mastering · Professionelle Audiobearbeitung" : "Adaptive mastering · Professional audio processing"}
          </div>
          <div className="text-[10px] flex items-center gap-1" style={{ color: "#22c55e" }}>
            <Lock size={11} strokeWidth={2} />
            <span>{lang === "de" ? "Kein Tracking · Keine Cookies · EU-Server" : "No tracking · No cookies · EU servers"}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        © {new Date().getFullYear()} Beatzucker ·{" "}
        <a href="mailto:info@re-beatz.com" style={{ color: "var(--text-muted)" }}>info@re-beatz.com</a>
      </div>
    </footer>
  );
}
