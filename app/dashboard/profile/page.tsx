"use client";

import ProfileSettings from "@/components/dashboard/ProfileSettings";
import { useUiLanguage } from "@/lib/useUiLanguage";
import { ThemeSettings } from "@/components/ThemeSelector";

export default function ProfilePage() {
  const lang = useUiLanguage();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{lang === "en" ? "Profile" : "Profil"}</h1>
      </div>
      <ThemeSettings lang={lang}/>
      <ProfileSettings />
    </div>
  );
}
