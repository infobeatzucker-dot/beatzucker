import { useEffect, useRef, useState } from "react";
import { renderComparison } from "./audio";
import type { inspect, Settings } from "./settings";

export function useComparison(buffer: AudioBuffer | undefined, settings: Settings) {
  const queue = useRef(Promise.resolve());
  const [result, setResult] = useState<{ buffer: AudioBuffer; settings: Settings; stats: ReturnType<typeof inspect> }>();
  const [failed, setFailed] = useState<{ buffer: AudioBuffer; settings: Settings }>();
  useEffect(() => {
    if (!buffer) return;
    let stale = false;
    // Keep the realtime path independent of full-track recomputes. A long render
    // may finish after another edit, but only the latest version updates the view.
    const delay = window.setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (stale) return;
        try {
          const stats = await renderComparison(buffer, settings);
          if (!stale) setResult({ buffer, settings, stats });
        } catch {
          if (!stale) setFailed({ buffer, settings });
        }
      });
    }, 330);
    return () => { stale = true; window.clearTimeout(delay); };
  }, [buffer, settings]);

  const current = result?.buffer === buffer && result?.settings === settings;
  const error = failed?.buffer === buffer && failed?.settings === settings;
  return {
    stats: result?.buffer === buffer ? result?.stats : undefined,
    updating: Boolean(buffer && !current && !error),
    error,
    current,
  };
}
