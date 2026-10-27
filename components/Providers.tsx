"use client";

import { SessionProvider } from "next-auth/react";
import { UiThemeProvider } from "@/contexts/UiThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider><UiThemeProvider>{children}</UiThemeProvider></SessionProvider>;
}
