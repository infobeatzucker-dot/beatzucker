import type { Metadata } from "next";
import DashboardShell from "./DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "https://beatzucker.de/dashboard" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
