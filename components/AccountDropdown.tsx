"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { User, LogOut } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

interface AccountInfo {
  dailyUsed: number;
  dailyLimit: number;
}

export default function AccountDropdown({ lang = "de" }: { lang?: Lang }) {
  const { data: session } = useSession();
  const [open, setOpen]   = useState(false);
  const [info, setInfo]   = useState<AccountInfo | null>(null);
  const ref               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/account")
      .then(r => r.json())
      .then(d => setInfo({ dailyUsed: d.dailyUsed ?? 0, dailyLimit: d.dailyLimit ?? 0 }))
      .catch(() => {});
  }, [session]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!session?.user) return null;

  const user      = session.user;
  const initial   = (user.name ?? user.email ?? "U")[0].toUpperCase();
  const hasLimit  = info && info.dailyLimit > 0;
  const pct       = hasLimit ? Math.min(100, Math.round((info!.dailyUsed / info!.dailyLimit) * 100)) : 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 34, height: 34,
          borderRadius: "50%",
          background: user.image
            ? "transparent"
            : "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
          border: "2px solid rgba(139,92,246,0.4)",
          cursor: "pointer",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.85rem",
          fontWeight: 700,
          color: "#fff",
          padding: 0,
        }}
        aria-label={lang === "de" ? "Konto" : "Account"}
      >
        {user.image
          ? <img src={user.image} alt={user.name ?? (lang === "de" ? "Profilbild" : "Profile picture")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          minWidth: 220,
          background: "var(--bg-elevated, #1a1a2e)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
          zIndex: 1000,
        }}>
          {/* User info */}
          <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name ?? user.email}
            </div>
            {user.name && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </div>
            )}
          </div>

          {/* Masters counter */}
          {hasLimit && (
            <div style={{ padding: "0.65rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                <span>{lang === "de" ? "Masters heute" : "Masters today"}</span>
                <span style={{ color: pct >= 90 ? "#f87171" : "#fff" }}>
                  {info!.dailyUsed} / {info!.dailyLimit}
                </span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                <div style={{
                  width: `${pct}%`, height: "100%", borderRadius: 2,
                  background: pct >= 90
                    ? "linear-gradient(90deg, #f87171, #ef4444)"
                    : "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))",
                  transition: "width 0.3s ease",
                }}/>
              </div>
            </div>
          )}

          {/* Menu items */}
          <div style={{ padding: "0.4rem 0" }}>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 1rem",
                fontSize: "0.85rem", color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              <User size={14} strokeWidth={2} /> Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", textAlign: "left",
                padding: "0.55rem 1rem", background: "none", border: "none",
                fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer",
              }}
            >
              <LogOut size={14} strokeWidth={2} /> {lang === "de" ? "Abmelden" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
