"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Library, UploadCloud, SlidersHorizontal, UserCircle, Menu, X, Sparkles, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { label: "Übersicht", href: "/dashboard",         icon: LayoutDashboard },
  { label: "Bibliothek", href: "/dashboard/library",  icon: Library },
  { label: "Uploads",   href: "/dashboard/uploads",  icon: UploadCloud },
  { label: "Referenzen", href: "/dashboard/presets", icon: SlidersHorizontal },
  { label: "Profil",   href: "/dashboard/profile",  icon: UserCircle },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="dashboard-nav flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`dashboard-nav-item ${active ? "nav-item-active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              padding: "0.72rem 0.85rem",
              borderRadius: "12px",
              fontSize: "0.85rem",
              fontWeight: active ? 700 : 500,
              color: active ? "var(--accent-purple)" : "var(--text-secondary)",
              textDecoration: "none",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            <Icon size={16} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ previewPath }: { previewPath?: string }) {
  const pathname = usePathname();
  const effectivePathname = previewPath ?? pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className="dashboard-sidebar hidden md:flex flex-col"
        style={{
          width: "var(--sidebar-width)",
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          padding: "1.5rem 1rem",
        }}
      >
        <Link href="/" className="brand-lockup dashboard-brand px-2 mb-1" style={{ textDecoration: "none" }}>
          <span className="brand-wave mini" aria-hidden="true">
            {[10, 22, 32, 18, 26, 12].map((height, index) => <i key={index} style={{ height }} />)}
          </span>
          <span className="font-black text-lg tracking-tight" style={{ color: "#fff" }}>
            Beatzucker
          </span>
        </Link>
        <div className="dashboard-brand-sub px-2 mb-7"><Sparkles size={10} /> KI-GESTÜTZTES MASTERING</div>

        <NavLinks pathname={effectivePathname} />

        <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
          <div className="sidebar-free-card">
            <span><ShieldCheck size={16} /> Kostenlos mastern</span>
            <small>Alle Werkzeuge. Keine Paywall.</small>
          </div>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div
        className="md:hidden flex items-center justify-between"
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,10,18,0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
          <span className="font-black text-base tracking-tight" style={{ color: "#fff" }}>Beatzucker</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menü"
          style={{ color: "var(--text-secondary)", padding: "0.4rem" }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              background: "rgba(8,10,15,0.97)",
              borderBottom: "1px solid rgba(139,92,246,0.12)",
              overflow: "hidden",
              position: "sticky",
              top: 53,
              zIndex: 39,
            }}
          >
            <div className="px-3 py-4">
              <NavLinks pathname={effectivePathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
