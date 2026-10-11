"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { useUiLanguage } from "@/lib/useUiLanguage";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const lang = useUiLanguage();

  useEffect(() => {
    if (status === "unauthenticated") router.push(lang === "en" ? "/en" : "/");
  }, [status, router, lang]);

  if (status !== "authenticated") {
    return <div className="min-h-screen" style={{ background: "var(--bg-primary)" }} />;
  }

  return (
    <div className="dashboard-shell min-h-screen flex">
      <Sidebar />
      <main className="dashboard-main flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">
        <div className="dashboard-content mx-auto">{children}</div>
      </main>
    </div>
  );
}
