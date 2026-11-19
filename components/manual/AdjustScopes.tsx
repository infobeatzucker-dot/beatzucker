"use client";


import { uiColor } from "@/lib/uiTheme";
import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/types/mastering";
import { startVisibleAnimation } from "@/lib/visibleAnimation";

/**
 * Animierte Audio-Scopes für die Tabs, in denen nur ein bis zwei Fader stehen.
 *
 * Die Scopes lesen die lokale Web-Audio-Kette und ruhen ohne Signal.
 */

function useCanvasLoop(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
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
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h);
    };
    const animation = startVisibleAnimation(cv, frame, { resize });

    return () => {
      animation.stop();
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

/** Stereo vectorscope from the preview's actual left and right channels. */
export function GoniometerScope({ width, lang, left, right, playing }: {
  width: number; lang: Lang; left?: AnalyserNode; right?: AnalyserNode; playing: boolean;
}) {
  const samples = useRef<[Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] | null>(null);
  const ref = useCanvasLoop((ctx, w, h) => {
    const cx = w / 2, cy = h / 2, radius = Math.max(0, Math.min(w, h) / 2 - 12);
    ctx.strokeStyle = uiColor("rgba(72,191,255,.3)");
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, radius * .7, 0, Math.PI * 2); ctx.stroke();
    if (!left || !right || !playing) return;
    if (!samples.current || samples.current[0].length !== left.fftSize) {
      samples.current = [new Float32Array(left.fftSize), new Float32Array(right.fftSize)];
    }
    const [l,r] = samples.current;
    left.getFloatTimeDomainData(l); right.getFloatTimeDomainData(r);
    ctx.fillStyle = uiColor("rgba(72,191,255,.65)");
    for (let i = 0; i < l.length; i += 5) {
      const x = cx + Math.max(-1, Math.min(1, (l[i] - r[i]) * .5)) * radius;
      const y = cy - Math.max(-1, Math.min(1, (l[i] + r[i]) * .5)) * radius;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }, [left, right, playing]);
  return <ScopeShell label={lang === "en" ? "Stereo vectorscope" : "Stereo-Vektorskop"} reading={`${Math.round(width * 100)} %`}>
    <canvas ref={ref} />
  </ScopeShell>;
}

/** Transferkurve + Obertonbalken — zeigt, wie stark der Drive die Kurve biegt. */
export function SaturationScope({ drive, lang, analyser, playing }: {
  drive: number; lang: Lang; analyser?: AnalyserNode | null; playing?: boolean;
}) {
  const bins = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const ref = useCanvasLoop((ctx, w, h) => {
    const pad = 20;
    const ox = pad, oy = h - pad, ax = w - pad * 5, ay = pad;

    ctx.strokeStyle = uiColor("rgba(255,255,255,.08)");
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
    ctx.strokeStyle = uiColor("#eb56d8");
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.shadowColor = uiColor("#eb56d8");
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const bw = 14, gap = 7;
    const bx = w - pad - 4 * (bw + gap);
    if (analyser && playing) {
      if (!bins.current || bins.current.length !== analyser.frequencyBinCount) bins.current = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins.current);
    }
    for (let k = 0; k < 4; k++) {
      const live = playing && bins.current ? bins.current[Math.min(bins.current.length - 1, 8 + k * 18)] / 255 : 0;
      const bh = live * Math.max(0, oy - ay - 4);
      ctx.fillStyle = k % 2 ? uiColor("rgba(72,191,255,.75)") : uiColor("rgba(139,92,246,.75)");
      ctx.fillRect(bx + k * (bw + gap), oy - bh, bw, bh);
    }
  }, [drive, analyser, playing]);

  return (
    <ScopeShell
      label={lang === "en" ? "Illustrative transfer curve · output spectrum" : "Transferkurve (schematisch) · Ausgangsspektrum"}
      reading={`Drive ${Math.round(drive * 100)} %`}
    >
      <canvas ref={ref} />
    </ScopeShell>
  );
}


/** Vier laufende Spektrumbänder für den Multiband-Kompressor. */
export function MultibandScope({ analyser, playing, lang }: {
  analyser?: AnalyserNode | null; playing?: boolean;
  lang: Lang;
}) {
  const bins = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const levels = useRef([0, 0, 0, 0]);
  const ref = useCanvasLoop((ctx, w, h) => {
    if (analyser && playing) {
      if (!bins.current || bins.current.length !== analyser.frequencyBinCount) bins.current = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins.current);
    }
    const ranges = [[1, 5], [5, 24], [24, 110], [110, 300]];
    const names = ["SUB", "LOW", "MID", "HIGH"];
    const gap = 12;
    const cardW = (w - gap * 5) / 4;
    for (let b = 0; b < 4; b++) {
      let raw = 0;
      if (bins.current && analyser && playing) {
        let sum = 0, count = 0;
        for (let i = ranges[b][0]; i < Math.min(ranges[b][1], bins.current.length); i++) { sum += bins.current[i] / 255; count++; }
        raw = count ? sum / count : 0;
      }
      levels.current[b] = playing ? levels.current[b] + (raw - levels.current[b]) * 0.16 : 0;
      const x = gap + b * (cardW + gap);
      const meterY = 32, meterH = h - 56;
      ctx.fillStyle = uiColor("rgba(255,255,255,.035)");
      ctx.fillRect(x, meterY, cardW, meterH);
      const fillH = meterH * Math.min(1, levels.current[b]);
      const grad = ctx.createLinearGradient(0, meterY + meterH, 0, meterY);
      grad.addColorStop(0, uiColor("#8b5cff")); grad.addColorStop(1, uiColor("#48bfff"));
      ctx.fillStyle = grad;
      ctx.fillRect(x, meterY + meterH - fillH, cardW, fillH);
      ctx.fillStyle = uiColor("rgba(230,235,255,.72)");
      ctx.font = "600 9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(names[b], x + cardW / 2, 18);
    }
  }, [analyser, playing]);
  return (
    <ScopeShell label={lang === "en" ? "Live band activity" : "Live-Bandaktivität"} reading={playing ? "LIVE" : "READY"}>
      <canvas ref={ref} />
    </ScopeShell>
  );
}
