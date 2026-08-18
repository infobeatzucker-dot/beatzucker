"use client";

import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/types/mastering";

/**
 * Animierte Audio-Scopes für die Tabs, in denen nur ein bis zwei Fader stehen.
 *
 * Sie visualisieren, was der jeweilige Regler mit dem Signal macht — das
 * Goniometer reagiert auf die Stereobreite, die Transferkurve auf den Drive,
 * das GR-Meter auf Schwelle und Ratio. Die Signalquelle ist eine Simulation,
 * keine Messung des laufenden Audios: der eigentliche Klangeindruck kommt aus
 * dem Abhören, hier geht es darum, die Wirkung eines Reglers sichtbar zu machen,
 * bevor man ihn bewegt.
 */

const REDUCE_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useCanvasLoop(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
  deps: unknown[],
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    let stopped = false;
    // Abmessungen cachen: getBoundingClientRect() pro Frame erzwingt jedes Mal
    // ein Layout und war eine der Ruckel-Ursachen.
    let w = 1, h = 1;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    // Nur messen, niemals zeichnen — sonst startet jede Größenänderung eine
    // weitere Endlosschleife, die nie wieder abgeräumt wird.
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const frame = () => {
      if (stopped) return;
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h, t);
      t += REDUCE_MOTION ? 0 : 0.022;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

function ScopeShell({
  label, reading, children,
}: { label: string; reading: string; children: React.ReactNode }) {
  return (
    <div className="adjust-scope">
      <span className="adjust-scope-label">{label}</span>
      <span className="adjust-scope-reading">{reading}</span>
      {children}
    </div>
  );
}

/** Goniometer — Punktwolke wird mit steigender Breite horizontal weiter. */
export function GoniometerScope({ width, lang }: { width: number; lang: Lang }) {
  const trail = useRef<{ x: number; y: number }[]>([]);
  const ref = useCanvasLoop((ctx, w, h, t) => {
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 16;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const l = Math.sin(t * 1.7 + i * 0.6) * 0.6 + Math.sin(t * 3.1 + i) * 0.25;
      const rr = (Math.sin(t * 1.7 + i * 0.6 + 0.4) * 0.6 + Math.sin(t * 2.6 + i * 1.3) * 0.25) * width;
      trail.current.push({ x: cx + (l - rr) * r * 0.5, y: cy - (l + rr) * r * 0.5 });
    }
    if (trail.current.length > 150) trail.current.splice(0, trail.current.length - 150);

    for (let j = 0; j < trail.current.length; j++) {
      const a = j / trail.current.length;
      ctx.fillStyle = `rgba(${Math.round(72 + a * 67)},${Math.round(191 - a * 20)},255,${a * 0.75})`;
      ctx.beginPath();
      ctx.arc(trail.current[j].x, trail.current[j].y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [width]);

  const reading =
    width < 0.9 ? (lang === "en" ? "narrow · mono-safe" : "schmal · mono-sicher")
    : width > 1.4 ? (lang === "en" ? "wide" : "breit")
    : (lang === "en" ? "balanced" : "ausgewogen");

  return (
    <ScopeShell label={lang === "en" ? "Goniometer" : "Goniometer"} reading={reading}>
      <canvas ref={ref} />
    </ScopeShell>
  );
}

/** Transferkurve + Obertonbalken — zeigt, wie stark der Drive die Kurve biegt. */
export function SaturationScope({ drive, lang }: { drive: number; lang: Lang }) {
  const ref = useCanvasLoop((ctx, w, h, t) => {
    const pad = 20;
    const ox = pad, oy = h - pad, ax = w - pad * 5, ay = pad;

    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(ax, oy);
    ctx.moveTo(ox, oy); ctx.lineTo(ox, ay);
    ctx.stroke();

    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.setLineDash([]);

    const drv = 1 + drive * 2;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const x = i / 48;
      const y = Math.tanh(x * drv) / Math.tanh(drv);
      const px = ox + x * (ax - ox);
      const py = oy - y * (oy - ay);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "#eb56d8";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.shadowColor = "#eb56d8";
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const xin = Math.sin(t * 2.3) * 0.5 + 0.5;
    const yin = Math.tanh(xin * drv) / Math.tanh(drv);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#eb56d8";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ox + xin * (ax - ox), oy - yin * (oy - ay), 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const bw = 14, gap = 7;
    const bx = w - pad - 4 * (bw + gap);
    for (let k = 0; k < 4; k++) {
      const amp = Math.max(2, (drive * 92) / (k + 1) * (0.8 + 0.2 * Math.sin(t * 4 + k)));
      const bh = Math.min(amp, oy - ay - 4);
      ctx.fillStyle = k % 2 ? "rgba(72,191,255,.75)" : "rgba(139,92,246,.75)";
      ctx.fillRect(bx + k * (bw + gap), oy - bh, bw, bh);
    }
  }, [drive]);

  return (
    <ScopeShell
      label={lang === "en" ? "Transfer curve & harmonics" : "Transferkurve & Obertöne"}
      reading={`THD ${(drive * 14).toFixed(1)} %`}
    >
      <canvas ref={ref} />
    </ScopeShell>
  );
}

/** Gain-Reduction-Meter mit laufender GR-Kurve. */
export function GainReductionScope({
  threshold, ratio, lang,
}: { threshold: number; ratio: number; lang: Lang }) {
  const lastGr = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, t) => {
    const pad = 18;
    const thrNorm = Math.min(1, Math.max(0, (threshold + 32) / 22));

    const sigAt = (x: number) =>
      Math.max(0, Math.sin(x * 3) * 0.5 + 0.5 + Math.sin(x * 7.3) * 0.15);
    const grAt = (s: number) => (s > thrNorm ? (s - thrNorm) * (1 - 1 / ratio) : 0);

    const sig = sigAt(t);
    const gr = grAt(sig) * 22;
    lastGr.current = gr;

    const barW = 30, bx = pad, by = pad, bh = h - pad * 2;
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.fillRect(bx, by, barW, bh);

    const thrY = by + bh * (1 - thrNorm);
    ctx.strokeStyle = "rgba(72,191,255,.7)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, thrY); ctx.lineTo(bx + barW, thrY); ctx.stroke();
    ctx.setLineDash([]);

    const sigH = bh * sig;
    const grad = ctx.createLinearGradient(0, by + bh - sigH, 0, by + bh);
    grad.addColorStop(0, "#48bfff");
    grad.addColorStop(1, "#8b5cff");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by + bh - sigH, barW, sigH);

    if (gr > 0.3) {
      ctx.fillStyle = "rgba(255,71,87,.85)";
      ctx.fillRect(bx, by + bh - sigH, barW, Math.min(gr * 2.2, sigH));
    }

    const lx = bx + barW + 24;
    const lw = w - lx - pad;
    if (lw > 20) {
      ctx.strokeStyle = "rgba(255,255,255,.07)";
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const gx = lx + (i / 8) * lw;
        ctx.moveTo(gx, by); ctx.lineTo(gx, by + bh);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const xt = t - (64 - i) * 0.05;
        const g = grAt(sigAt(xt));
        const px = lx + (i / 64) * lw;
        const py = by + g * bh * 3.2;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#ff4757";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#ff4757";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [threshold, ratio]);

  // Stärkste Gain-Reduktion, die diese Einstellung bei Vollpegel erreichen kann.
  // Ein fester, ablesbarer Wert sagt hier mehr als eine zappelnde Live-Zahl.
  const thrNorm = Math.min(1, Math.max(0, (threshold + 32) / 22));
  const maxGr = (1 - thrNorm) * (1 - 1 / ratio) * 22;

  return (
    <ScopeShell
      label={lang === "en" ? "Gain reduction" : "Gain Reduction"}
      reading={`${lang === "en" ? "up to" : "bis"} −${maxGr.toFixed(1)} dB`}
    >
      <canvas ref={ref} />
    </ScopeShell>
  );
}
