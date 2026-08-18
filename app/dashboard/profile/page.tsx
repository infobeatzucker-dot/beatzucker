"use client";

import ProfileSettings from "@/components/dashboard/ProfileSettings";

export default function ProfilePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Profile</h1>
      </div>
      <ProfileSettings />
    </div>
  );
}
