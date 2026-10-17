"use client";
import { useEffect, useRef, type RefObject } from "react";
import { drawSonicCore, sonicStage } from "@/lib/sonicCore";
import { startVisibleAnimation } from "@/lib/visibleAnimation";

export default function MasteringSonicCore({ step, completed }: { step?: string; completed: RefObject<boolean> }) {
  const canvas = useRef<HTMLCanvasElement>(null), current = useRef(sonicStage(step));
  const animation = useRef<ReturnType<typeof startVisibleAnimation> | null>(null);
  useEffect(() => { current.current = sonicStage(step); animation.current?.invalidate(); }, [step]);
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext("2d", { alpha: true });
    if (!element || !ctx) return;
    let width = 0, height = 0, clock = 0, previous = 0, finish = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      const rect = element.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width; height = rect.height; element.width = Math.max(1, Math.round(width * dpr)); element.height = Math.max(1, Math.round(height * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    animation.current = startVisibleAnimation(element, now => {
      const delta = previous ? Math.min(50, Math.max(0, now - previous)) : 0; previous = now;
      if (!reduced.matches) clock += delta;
      if (completed.current) finish = reduced.matches ? 1 : Math.min(1, finish + delta / 260);
      drawSonicCore(ctx, width, height, reduced.matches ? 0 : clock, completed.current ? "complete" : current.current, finish);
    }, { maxFps: 24, reducedFps: 0, resize });
    return () => { animation.current?.stop(); animation.current = null; };
  }, [completed]);
  return <canvas ref={canvas} className="sonic-progress-canvas" aria-hidden="true" />;
}
