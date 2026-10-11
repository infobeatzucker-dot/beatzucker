"use client";
import { useEffect, useMemo, useRef } from "react";

/** Prevent obsolete decode/render/fetch results from replacing current files. */
export function useToolJob() {
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  return useMemo(() => ({
    start() { current.current?.abort(); const job = new AbortController(); current.current = job; return job; },
    active(job: AbortController) { return current.current === job && !job.signal.aborted; },
    cancel() { current.current?.abort(); current.current = null; },
  }), []);
}
