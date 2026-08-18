"use client";

import MasteringWorkspace from "@/components/MasteringWorkspace";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Track hochladen, mastern und direkt herunterladen.
        </p>
      </div>
      <MasteringWorkspace lang="de" />
    </div>
  );
}
