import Link from "next/link";
import CookieReopenButton from "./CookieReopenButton";

export default function Footer() {
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
            <span style={{ color: "var(--accent-purple)" }}>Up</span>
            <span style={{ color: "var(--accent-cyan)" }}>Ma</span>
            <span style={{ color: "#f59e0b" }}>Do</span>
          </span>
        </div>

        {/* Legal links */}
        <div className="flex gap-5 text-xs flex-wrap justify-center" style={{ color: "var(--text-muted)" }}>
          <Link href="/features" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Features</Link>
          <Link href="/help" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Hilfe</Link>
          <Link href="/ressourcen" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Wissen</Link>
          <Link href="/impressum" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Datenschutz</Link>
          <Link href="/agb" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>AGB</Link>
          <Link href="/widerruf" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Widerruf</Link>
          <Link href="/terms" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
          <span style={{ color: "inherit" }}><CookieReopenButton /></span>
        </div>

        {/* Privacy badge */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Real AI Mastering · Professional Audio Processing
          </div>
          <div className="text-[10px] flex items-center gap-1" style={{ color: "#22c55e" }}>
            <span>🔒</span>
            <span>No Tracking · No Cookies · EU-Server</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        © {new Date().getFullYear()} UpMaDo ·{" "}
        <a href="mailto:info@re-beatz.com" style={{ color: "var(--text-muted)" }}>info@re-beatz.com</a>
      </div>
    </footer>
  );
}
