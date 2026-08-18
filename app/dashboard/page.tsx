"use client";

import MasteringWorkspace from "@/components/MasteringWorkspace";

export default function DashboardPage() {
  return (
    <div>
      <div className="workspace-page-heading">
        <div>
          <span className="workspace-eyebrow">KI-MASTERING-STUDIO</span>
          <h1>Verwandle deinen Sound.</h1>
          <p>Track hochladen, präzise analysieren und direkt als professionelles Master exportieren.</p>
        </div>
        <span className="workspace-free-badge"><i /> 100 % kostenlos</span>
      </div>
      <MasteringWorkspace lang="de" />
    </div>
  );
}
