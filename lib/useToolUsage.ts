"use client";
import { useEffect, useRef } from "react";

type Run = { id: string; tool: string; chain: Promise<unknown> };
function report(run: Run, outcome: string) {
  // Serialize start and finish so a fast/local result cannot overtake its start.
  run.chain = run.chain.then(() => fetch("/api/tool-usage", {
    method: "POST", credentials: "omit", keepalive: true, signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: run.id, tool: run.tool, outcome }),
  })).catch(() => {});
}
export function useToolUsage(tool: string, enabled: boolean, busy: boolean, complete: boolean, incomplete: boolean, error?: string) {
  const current = useRef<Run | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (busy && !current.current && typeof globalThis.crypto?.randomUUID === "function") {
      const run = { id: crypto.randomUUID(), tool, chain: Promise.resolve() };
      current.current = run; report(run, "started");
    } else if (!busy && current.current) {
      const run = current.current; current.current = null;
      report(run, error ? "error" : incomplete ? "partial" : complete ? "completed" : "cancelled");
    }
  }, [tool, enabled, busy, complete, incomplete, error]);
  useEffect(() => () => {
    if (current.current) { report(current.current, "cancelled"); current.current = null; }
  }, []);
}
