"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Library, UploadCloud, SlidersHorizontal, UserCircle, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard",         icon: LayoutDashboard },
  { label: "Library",   href: "/dashboard/library",  icon: Library },
  { label: "Uploads",   href: "/dashboard/uploads",  icon: UploadCloud },
  { label: "Presets",   href: "/dashboard/presets",  icon: SlidersHorizontal },
  { label: "Profile",   href: "/dashboard/profile",  icon: UserCircle },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
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
            className={active ? "nav-item-active" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              padding: "0.6rem 0.85rem",
              borderRadius: "10px",
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

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className="hidden md:flex flex-col"
        style={{
          width: "var(--sidebar-width)",
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          padding: "1.5rem 1rem",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,10,18,0.6)",
        }}
      >
        <Link href="/" className="flex items-center gap-2 px-2 mb-1" style={{ textDecoration: "none" }}>
          <span className="font-black text-lg tracking-tight">
            <span style={{ color: "var(--accent-purple)" }}>Beat</span>
            <span style={{ color: "var(--accent-cyan)" }}>zucker</span>
          </span>
        </Link>
        <div className="px-2 mb-6 label" style={{ fontSize: "10px" }}>AI-Powered Mastering</div>

        <NavLinks pathname={pathname} />

        <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
          <div
            className="px-3 py-2 rounded-lg text-center"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--accent-cyan)",
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            Kostenloses AI-Mastering
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
          <span className="font-black text-base tracking-tight">
            <span style={{ color: "var(--accent-purple)" }}>Beat</span>
            <span style={{ color: "var(--accent-cyan)" }}>zucker</span>
          </span>
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
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
