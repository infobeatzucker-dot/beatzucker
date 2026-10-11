"use client";

import ProfileSettings from "@/components/dashboard/ProfileSettings";
import { useUiLanguage } from "@/lib/useUiLanguage";

export default function ProfilePage() {
  const lang = useUiLanguage();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{lang === "en" ? "Profile" : "Profil"}</h1>
      </div>
      <ProfileSettings />
    </div>
  );
}
