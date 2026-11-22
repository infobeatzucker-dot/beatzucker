"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowDown } from "lucide-react";
import Header from "@/components/Header";
import ToolUsageStats from "@/components/admin/ToolUsageStats";
import UserDailyLimit from "@/components/admin/UserDailyLimit";
import UserStemAccess from "@/components/admin/UserStemAccess";
import UserMasteringLabAccess from "@/components/admin/UserMasteringLabAccess";
import ShowcaseManager from "@/components/admin/ShowcaseManager";
import CommunityExamplesManager from "@/components/admin/CommunityExamplesManager";
import DonationPopupSetting from "@/components/admin/DonationPopupSetting";
import { useUiLanguage } from "@/lib/useUiLanguage";

interface Stats {
  totalUsers: number;
  totalMasters: number;
  mastersToday: number;
  masterErrors: number;
  labCompleted: number;
  studioCompleted: number;
}

interface AdminUser {
  dailyMasterLimit: number | null;
  vocalRemoverEnabled: boolean;
  masteringLabEnabled: boolean;
  stemSeparationEnabled: boolean;
  dailyLimit: number;
  dailyUsed: number;
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  mastersCount: number;
  labMastersCount: number;
  lastSeenAt: string | null;
  lastMasteredAt: string | null;
}

interface RecentMaster {
  id: string;
  originalName: string;
  platform: string;
  status: string;
  createdAt: string;
  userEmail: string;
  workspace: string;
}

interface PromoData {
  id: string;
  active: boolean;
  title: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  bgStyle: string;
  expiresAt?: string | null;
}

const BG_OPTIONS = [
  { value: "purple", label: "Lila", color: "rgb(var(--bz-paint-8b5cf6))" },
  { value: "cyan",   label: "Cyan",  color: "rgb(var(--bz-paint-38bdf8))" },
  { value: "gold",   label: "Gold",  color: "rgb(var(--bz-paint-c4b5fd))" },
  { value: "fire",   label: "Fire",  color: "rgb(var(--bz-paint-ef4444))" },
];

const BG_PREVIEW: Record<string, { border: string; bg: string; badge: string }> = {
  purple: { border: "rgba(var(--bz-border-8b5cf6),0.6)", bg: "linear-gradient(135deg,rgba(139,92,246,.18),rgba(56,189,248,.06))", badge: "linear-gradient(135deg,#8b5cf6,#38bdf8)" },
  cyan:   { border: "rgba(var(--bz-border-38bdf8),0.6)",   bg: "linear-gradient(135deg,rgba(56,189,248,.15),rgba(139,92,246,.06))", badge: "linear-gradient(135deg,#38bdf8,#8b5cf6)" },
  gold:   { border: "rgba(var(--bz-border-c4b5fd),0.6)",  bg: "linear-gradient(135deg,rgba(196,181,253,.15),rgba(245,130,32,.08))", badge: "linear-gradient(135deg,#c4b5fd,#f08020)" },
  fire:   { border: "rgba(var(--bz-border-ef4444),0.6)",   bg: "linear-gradient(135deg,rgba(239,68,68,.16),rgba(245,130,32,.08))", badge: "linear-gradient(135deg,#ef4444,#f59e0b)" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatActivityDate(iso: string, lang: "de" | "en") {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "de-DE", {
    dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    done:       ["rgba(16,185,129,0.15)", "#10b981"],
    processing: ["rgba(245,158,11,0.15)", "#f59e0b"],
    error:      ["rgba(239,68,68,0.15)",  "#f87171"],
    pending:    ["rgba(255,255,255,0.08)","#9ca3af"],
  };
  const [bg, color] = colors[status] ?? colors.pending;
  return (
    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem",
      borderRadius: "5px", background: bg, color, whiteSpace: "nowrap" as const }}>
      {status}
    </span>
  );
}

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{
    background: "var(--bg-elevated, rgb(var(--bz-paint-1a1a2e)))",
    border: "1px solid rgba(var(--bz-border-ffffff),0.07)",
    borderRadius: "12px", padding: "1.25rem",
    ...style,
  }}>{children}</div>
);

// ── Promo Preview mini-popup ──────────────────────────────────────────────────
function PromoPreview({ title, body, ctaText, bgStyle }: { title: string; body: string; ctaText: string; bgStyle: string }) {
  const s = BG_PREVIEW[bgStyle] ?? BG_PREVIEW.purple;
  return (
    <div style={{
      position: "relative", borderRadius: "14px", padding: "1.25rem",
      background: s.bg, border: `1px solid ${s.border}`,
      marginTop: "1.25rem",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.badge, borderRadius: "14px 14px 0 0" }} />
      <div style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em",
        textTransform: "uppercase", background: s.badge, WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent", marginBottom: "0.5rem" }}>
        Vorschau
      </div>
      <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
        display: "inline-block", background: s.badge, borderRadius: "4px",
        padding: "0.15rem 0.5rem", color: "rgb(var(--bz-paint-ffffff))", marginBottom: "0.6rem" }}>
        Aktion
      </div>
      <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.4rem", lineHeight: 1.25 }}>
        {title || <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>Titel…</span>}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: ctaText ? "0.75rem" : 0 }}>
        {body || <span style={{ color: "var(--text-muted)" }}>Aktionstext…</span>}
      </div>
      {ctaText && (
        <div style={{ display: "inline-block", background: s.badge,
          borderRadius: "7px", padding: "0.4rem 0.9rem",
          color: "rgb(var(--bz-paint-ffffff))", fontSize: "0.78rem", fontWeight: 700 }}>
          {ctaText}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const lang = useUiLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<{
    stats: Stats;
    users: AdminUser[];
    recentMasters: RecentMaster[];
    promo: PromoData | null;
    pagination: {page:number;pageSize:number;total:number};
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page,setPage]=useState(1);
  const [refreshKey,refresh]=useState(0);
  const [tableStatus,setTableStatus]=useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Admin password reset state
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function resetAdminPassword() {
    if (pwNew.length < 8) { setPwMsg({ ok: false, text: "Mindestens 8 Zeichen." }); return; }
    if (pwNew !== pwNew2) { setPwMsg({ ok: false, text: "Passwörter stimmen nicht überein." }); return; }
    setPwSaving(true); setPwMsg(null);
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-admin-password", newPassword: pwNew }),
    });
    const d = await res.json();
    setPwSaving(false);
    if (!res.ok) { setPwMsg({ ok: false, text: d.error ?? "Fehler" }); return; }
    setPwMsg({ ok: true, text: "Passwort erfolgreich geändert." });
    setPwNew(""); setPwNew2("");
  }

  // Promo form state
  const [promoActive, setPromoActive] = useState(false);
  const [promoTitle, setPromoTitle] = useState("");
  const [promoBody, setPromoBody] = useState("");
  const [promoCtaText, setPromoCtaText] = useState("");
  const [promoCtaUrl, setPromoCtaUrl] = useState("");
  const [promoBg, setPromoBg] = useState("purple");
  const [promoExpiry, setPromoExpiry] = useState("");
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller=new AbortController();
    fetch("/api/admin", {signal:controller.signal,cache:"no-store"})
      .then(r => {
        if (!r.ok) throw new Error(r.status===403?"Kein Zugriff":"Daten nicht verfügbar");
        return r.json();
      })
      .then(d => {
        setData(d);
        if (d.promo) {
          setPromoActive(d.promo.active);
          setPromoTitle(d.promo.title ?? "");
          setPromoBody(d.promo.body ?? "");
          setPromoCtaText(d.promo.ctaText ?? "");
          setPromoCtaUrl(d.promo.ctaUrl ?? "");
          setPromoBg(d.promo.bgStyle ?? "purple");
          setPromoExpiry(d.promo.expiresAt ? d.promo.expiresAt.slice(0, 10) : "");
        }
        setLoading(false);
      })
      .catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } });
    return ()=>controller.abort();
  }, [status]);

  useEffect(()=>{
    if(status!=="authenticated"||loading||error)return;
    const controller=new AbortController();
    setTableStatus(lang==="en"?"Loading accounts…":"Nutzer werden geladen …");
    const timer=window.setTimeout(async()=>{
      try {
        const response=await fetch("/api/admin?"+new URLSearchParams({q:search,page:String(page)}),{signal:controller.signal,cache:"no-store"});
        if(!response.ok)throw Error();
        const next=await response.json();
        if(controller.signal.aborted)return;
        if(next.pagination.page>1&&!next.users.length){setPage(Math.max(1,Math.ceil(next.pagination.total/next.pagination.pageSize)));return;}
        setData(current=>current?{...current,users:next.users,pagination:next.pagination,stats:next.stats}:current);
        setTableStatus("");
      }catch{if(!controller.signal.aborted)setTableStatus(lang==="en"?"Could not load accounts.":"Nutzer konnten nicht geladen werden.");}
    },250);
    return ()=>{ controller.abort(); window.clearTimeout(timer); };
  },[status,loading,error,search,page,refreshKey,lang]);

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Nutzer "${email}" wirklich löschen?`)) return;
    setDeletingId(userId);
    try {
      const response=await fetch(`/api/admin?userId=${encodeURIComponent(userId)}`,{method:"DELETE"});
      if(!response.ok)throw Error();
      const result=await response.json();
      refresh(value=>value+1);
      if(result.cleanupPending)setTableStatus(lang==="en"?"Account deleted. Audio cleanup is pending.":"Konto gelöscht. Audiobereinigung steht aus.");
    }catch{setTableStatus(lang==="en"?"Could not delete account.":"Konto konnte nicht gelöscht werden.");}
    finally{setDeletingId(null);}
  }

  async function savePromo() {
    if (!promoTitle.trim() || !promoBody.trim()) {
      setPromoMsg({ ok: false, text: "Titel und Text sind erforderlich." });
      return;
    }
    setPromoSaving(true);
    setPromoMsg(null);
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "promo",
        active: promoActive,
        title: promoTitle,
        body: promoBody,
        ctaText: promoCtaText || null,
        ctaUrl: promoCtaUrl || null,
        bgStyle: promoBg,
        expiresAt: promoExpiry || null,
      }),
    });
    const d = await res.json();
    setPromoSaving(false);
    if (!res.ok) { setPromoMsg({ ok: false, text: d.error ?? "Fehler" }); return; }
    setPromoMsg({ ok: true, text: promoActive ? "Aktion gespeichert & aktiv." : "Aktion gespeichert (inaktiv)." });
    setData(prev => prev ? { ...prev, promo: d.promo } : prev);
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ background: "var(--bg-primary)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Lädt…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "var(--bg-primary)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgb(var(--bz-paint-f87171))", fontSize: "0.9rem" }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, users, recentMasters, pagination } = data;
  const workspaceName=(workspace:string)=>workspace==="lab"?"Mastering Lab":workspace==="studio"?"Studio Mode"
    :workspace==="classic"?(lang==="en"?"Classic":"Klassisch"):(lang==="en"?"Classic / Studio (legacy)":"Klassisch / Studio (Altbestand)");

  const serverMasters=stats.totalMasters-stats.labCompleted;
  const errorRate = serverMasters > 0 ? ((stats.masterErrors / serverMasters) * 100).toFixed(1) : "0.0";

  const statItems = [
    { label: "Nutzer gesamt",  value: stats.totalUsers,          color: "var(--accent-purple)" },
    { label: "Masters gesamt", value: stats.totalMasters,         color: "var(--accent-cyan)" },
    { label: "Masters heute",  value: stats.mastersToday,         color: "var(--accent-gold)" },
    { label: "Studio Mode", value: stats.studioCompleted, color: "var(--accent-purple)" },
    { label: "Mastering Lab", value: stats.labCompleted, color: "var(--accent-cyan)" },
    { label: lang==="en"?"Classic / Studio error rate":"Fehlerrate Klassisch / Studio", value: `${errorRate}%`, color: stats.masterErrors > 0 ? "#f87171" : "#10b981" },
  ];

  const thStyle: React.CSSProperties = {
    padding: "0.4rem 0.6rem", textAlign: "left", color: "var(--text-muted)",
    fontWeight: 600, fontSize: "0.72rem", letterSpacing: "0.05em",
    textTransform: "uppercase", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: "var(--text-secondary)",
  };
  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem", background: "rgba(var(--bz-paint-ffffff),0.05)",
    border: "1px solid rgba(var(--bz-border-ffffff),0.1)", borderRadius: "8px",
    color: "var(--text-primary)", fontSize: "0.85rem", outline: "none", width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <Header />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "6rem 1.5rem 4rem" }}>

        {/* Title */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{
            display: "inline-block", background: "rgba(var(--bz-paint-ef4444),0.1)",
            border: "1px solid rgba(var(--bz-border-ef4444),0.25)", borderRadius: "6px",
            padding: "0.25rem 0.75rem", fontSize: "0.72rem", color: "rgb(var(--bz-paint-f87171))",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem",
          }}>Admin</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "rgb(var(--bz-paint-ffffff))", margin: 0 }}>Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
            {session?.user?.email}
          </p>
          <a href="#recent-masters" className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ color: "var(--accent-cyan)", borderColor: "var(--border-glow)", background: "var(--bg-elevated)" }}>
            {lang === "en" ? "Jump to recent masters" : "Zu den letzten Masterings"}
            <ArrowDown size={15} aria-hidden="true"/>
          </a>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {statItems.map(s => card(
            <>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{s.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            </>
          ))}
        </div>

        <DonationPopupSetting lang={lang}/>
        <ToolUsageStats />
        <ShowcaseManager />
        <CommunityExamplesManager />

        {/* ── ADMIN PASSWORD RESET ── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--bz-paint-f87171))",
            letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem" }}>
            Admin-Passwort ändern
          </h2>
          {card(
            <div style={{ maxWidth: 400 }}>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>
                    Neues Passwort
                  </label>
                  <input
                    type="password" value={pwNew} onChange={e => setPwNew(e.target.value)}
                    placeholder="Mindestens 8 Zeichen"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>
                    Passwort bestätigen
                  </label>
                  <input
                    type="password" value={pwNew2} onChange={e => setPwNew2(e.target.value)}
                    placeholder="Wiederholen"
                    onKeyDown={e => e.key === "Enter" && resetAdminPassword()}
                    style={inputStyle}
                  />
                </div>
                {pwMsg && (
                  <div style={{ fontSize: "0.8rem", color: pwMsg.ok ? "rgb(var(--bz-paint-10b981))" : "rgb(var(--bz-paint-f87171))" }}>
                    {pwMsg.text}
                  </div>
                )}
                <button onClick={resetAdminPassword} disabled={pwSaving} style={{
                  padding: "0.65rem 1.25rem", alignSelf: "flex-start",
                  background: "linear-gradient(135deg,rgb(var(--bz-paint-ef4444)),rgb(var(--bz-paint-f59e0b)))",
                  border: "none", borderRadius: "8px", color: "rgb(var(--bz-paint-ffffff))",
                  fontWeight: 700, fontSize: "0.88rem",
                  cursor: pwSaving ? "wait" : "pointer", opacity: pwSaving ? 0.7 : 1,
                }}>
                  {pwSaving ? "Speichern…" : "Passwort speichern"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── PROMO SECTION ── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--bz-paint-c4b5fd))",
            letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem" }}>
            Aktions-Popup
          </h2>
          {card(
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>

              {/* Left: form */}
              <div>
                {/* Active toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <button
                    onClick={() => setPromoActive(v => !v)}
                    style={{
                      position: "relative", width: 44, height: 24, borderRadius: 12,
                      background: promoActive ? "linear-gradient(135deg,rgb(var(--bz-paint-8b5cf6)),rgb(var(--bz-paint-38bdf8)))" : "rgba(var(--bz-paint-ffffff),0.1)",
                      border: "none", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3, left: promoActive ? 23 : 3,
                      width: 18, height: 18, borderRadius: "50%", background: "rgb(var(--bz-paint-ffffff))",
                      transition: "left 0.18s", display: "block",
                    }} />
                  </button>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600,
                    color: promoActive ? "var(--accent-cyan)" : "var(--text-muted)" }}>
                    {promoActive ? "Aktiv — sichtbar auf Startseite" : "Inaktiv"}
                  </span>
                </div>

                {/* Titel */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase",
                    letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Titel</label>
                  <input value={promoTitle} onChange={e => setPromoTitle(e.target.value)}
                    placeholder="z.B. Black Friday — 30% Rabatt!" style={inputStyle} />
                </div>

                {/* Body text */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase",
                    letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Aktionstext</label>
                  <textarea value={promoBody} onChange={e => setPromoBody(e.target.value)}
                    placeholder="Beschreibe die Aktion…" rows={3}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                </div>

                {/* CTA */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase",
                      letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Button-Text</label>
                    <input value={promoCtaText} onChange={e => setPromoCtaText(e.target.value)}
                      placeholder="z.B. Jetzt mastern" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase",
                      letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Button-URL</label>
                    <input value={promoCtaUrl} onChange={e => setPromoCtaUrl(e.target.value)}
                      placeholder="/" style={inputStyle} />
                  </div>
                </div>

                {/* Farbe */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase",
                    letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>Farbe</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {BG_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setPromoBg(opt.value)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.4rem",
                          padding: "0.3rem 0.65rem", borderRadius: "7px", cursor: "pointer",
                          background: promoBg === opt.value ? "rgba(var(--bz-paint-ffffff),0.1)" : "rgba(var(--bz-paint-ffffff),0.04)",
                          border: promoBg === opt.value ? `1px solid ${opt.color}` : "1px solid rgba(var(--bz-paint-ffffff),0.08)",
                          color: promoBg === opt.value ? opt.color : "var(--text-muted)",
                          fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                        }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ablaufdatum */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase",
                    letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>
                    Ablaufdatum (optional)
                  </label>
                  <input type="date" value={promoExpiry} onChange={e => setPromoExpiry(e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>

                {/* Save button */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <button onClick={savePromo} disabled={promoSaving} style={{
                    padding: "0.65rem 1.5rem",
                    background: "linear-gradient(135deg,var(--accent-purple),var(--accent-cyan))",
                    border: "none", borderRadius: "8px", color: "rgb(var(--bz-paint-ffffff))",
                    fontWeight: 700, fontSize: "0.88rem", cursor: promoSaving ? "wait" : "pointer",
                    opacity: promoSaving ? 0.7 : 1,
                  }}>
                    {promoSaving ? "Speichern…" : "Speichern"}
                  </button>
                  {promoMsg && (
                    <span style={{ fontSize: "0.82rem", color: promoMsg.ok ? "rgb(var(--bz-paint-10b981))" : "rgb(var(--bz-paint-f87171))" }}>
                      {promoMsg.text}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: live preview */}
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase",
                  letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Live-Vorschau</div>
                <PromoPreview title={promoTitle} body={promoBody} ctaText={promoCtaText} bgStyle={promoBg} />
              </div>

            </div>
          )}
        </div>

        {/* ── USERS TABLE ── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-purple)",
              letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              {lang==="en"?"Accounts":"Nutzer"} ({pagination.total})
            </h2>
            <input
              aria-label={lang==="en"?"Search email or name":"Nach E-Mail oder Name suchen"}
              placeholder={lang==="en"?"Email or name…":"E-Mail oder Name …"}
              value={search} maxLength={120} onChange={e => {setSearch(e.target.value);setPage(1);}}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: "7px",
                background: "rgba(var(--bz-paint-ffffff),0.05)", border: "1px solid rgba(var(--bz-border-ffffff),0.1)",
                color: "var(--text-primary)", fontSize: "0.82rem", outline: "none", width: 240,
              }}
            />
          </div>
          {card(
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(var(--bz-border-ffffff),0.07)" }}>
                    {["Email", "Name", "Masters", lang === "en" ? "Daily limit" : "Tageslimit", lang === "en" ? "Member since" : "Dabei seit", lang === "en" ? "Last online" : "Zuletzt online", lang === "en" ? "Last mastered" : "Zuletzt gemastert", ""].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(var(--bz-border-ffffff),0.04)" }}>
                      <td style={{ ...tdStyle, color: "var(--text-primary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</td>
                      <td style={tdStyle}>{u.name ?? "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{u.mastersCount}{u.labMastersCount>0&&<small> · Lab {u.labMastersCount}</small>}</td>
                      <td style={tdStyle}><UserDailyLimit lang={lang} userId={u.id} email={u.email} value={u.dailyMasterLimit} used={u.dailyUsed} onSaved={quota => setData(current => current ? { ...current, users: current.users.map(user => user.id === u.id ? { ...user, ...quota } : user) } : current)} /><UserStemAccess userId={u.id} vocal={u.vocalRemoverEnabled} stems={u.stemSeparationEnabled} en={lang === "en"}/><UserMasteringLabAccess userId={u.id} enabled={u.masteringLabEnabled} en={lang === "en"}/></td>
                      <td style={tdStyle}>{fmtDate(u.createdAt)}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{u.lastSeenAt ? formatActivityDate(u.lastSeenAt, lang) : lang === "en" ? "Not recorded" : "Nicht erfasst"}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{u.lastMasteredAt ? formatActivityDate(u.lastMasteredAt, lang) : "—"}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          disabled={deletingId === u.id}
                          style={{
                            background: "rgba(var(--bz-paint-ef4444),0.1)", border: "1px solid rgba(var(--bz-border-ef4444),0.25)",
                            color: "rgb(var(--bz-paint-f87171))", borderRadius: "5px", padding: "0.25rem 0.6rem",
                            fontSize: "0.72rem", cursor: "pointer", fontWeight: 600,
                          }}
                        >{deletingId === u.id ? "…" : "Löschen"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>{lang==="en"?"Previous page":"Vorherige Seite"}</button>
            <span>{pagination.page} / {Math.max(1,Math.ceil(pagination.total/pagination.pageSize))}</span>
            <button type="button" disabled={page*pagination.pageSize>=pagination.total} onClick={()=>setPage(value=>value+1)}>{lang==="en"?"Next page":"Nächste Seite"}</button>
            {tableStatus&&<span role="status">{tableStatus}</span>}
          </div>
        </div>

        {/* ── RECENT MASTERS ── */}
        <div>
          <h2 id="recent-masters" tabIndex={-1} style={{ scrollMarginTop: "7rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-purple)",
            letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem" }}>
            {lang === "en" ? "Recent masters (20)" : "Letzte Masterings (20)"}
          </h2>
          {card(
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(var(--bz-border-ffffff),0.07)" }}>
                    {(lang==="en"?["Date","File","Workspace","Target","Status","Account"]:["Datum","Datei","Arbeitsbereich","Ziel","Status","Konto"]).map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentMasters.map(m => (
                    <tr key={m.id} style={{ borderBottom: "1px solid rgba(var(--bz-border-ffffff),0.04)" }}>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{fmtDate(m.createdAt)}</td>
                      <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>{m.originalName}</td>
                      <td style={tdStyle}>{workspaceName(m.workspace)}</td>
                      <td style={tdStyle}>{m.platform}</td>
                      <td style={tdStyle}><StatusBadge status={m.status} /></td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.userEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
