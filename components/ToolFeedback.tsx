import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";

export default function ToolFeedback({ lang, state, detail, onRetry }: {
  lang: Lang; state: "idle" | "working" | "success" | "warning" | "error";
  detail?: string; onRetry?: () => void;
}) {
  const en = lang === "en";
  const titles = {
    idle: "", working: en ? "Processing" : "Verarbeitung läuft",
    success: en ? "Completed" : "Abgeschlossen",
    warning: en ? "Please review" : "Bitte prüfen", error: en ? "Could not complete" : "Nicht abgeschlossen",
  };
  // Keep the live region mounted even while idle, so later updates are announced.
  return <div aria-live={state === "error" ? "assertive" : "polite"} aria-atomic="true">
    {state !== "idle" && <div className={`tool-feedback ${state}`} role={state === "error" ? "alert" : "status"} aria-busy={state === "working"}>
      {state === "working" ? <Loader2 className="mixcheck-spin" size={20} aria-hidden="true"/> : state === "success" ? <CheckCircle2 size={20} aria-hidden="true"/> : <AlertTriangle size={20} aria-hidden="true"/>}
      <div><strong>{titles[state]}</strong>{detail && <p>{detail}</p>}</div>
      {state === "error" && onRetry && <button type="button" onClick={onRetry}>{en ? "Try again" : "Erneut versuchen"}</button>}
    </div>}
  </div>;
}
