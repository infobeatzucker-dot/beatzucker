"use client";

import { useEffect, useRef } from "react";
import { useUiThemeSnapshot } from "@/lib/useUiThemeSnapshot";
import { startVisibleAnimation } from "@/lib/visibleAnimation";

type View = "wave" | "spectrum";
const BANDS = 104;
const TICKS = [30, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000];
const HIGH_LOW_RATIO = 18000 / 25;

export default function StudioSignalScope({ view, mono, left, right, playing }: {
  view: View; mono: AnalyserNode | null; left?: AnalyserNode | null; right?: AnalyserNode | null; playing: boolean;
}) {
  const scope = useRef<HTMLCanvasElement>(null);
  const theme = useUiThemeSnapshot();
  useEffect(() => {
    const canvas = scope.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!playing || !mono) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }

    const frequency = new Float32Array(mono.frequencyBinCount);
    const traces = (left && right ? [left, right] : [mono]).map(node => ({ node, data: new Float32Array(node.fftSize) }));
    const held = new Float32Array(BANDS);
    const levels = new Float32Array(BANDS);
    const bin = (fraction: number) => Math.min(frequency.length, Math.round(25 * HIGH_LOW_RATIO ** fraction * mono.fftSize / mono.context.sampleRate));
    const starts = Array.from({ length: BANDS + 1 }, (_, index) => bin(index / BANDS));
    let width = 0, height = 0, lastTime = 0;
    let cyan = "#48dcff", purple = "#ed72ff";
    function resize() {
      if (!canvas || !ctx) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const style = getComputedStyle(canvas);
      cyan = style.getPropertyValue("--beta-a").trim() || cyan;
      purple = style.getPropertyValue("--beta-b").trim() || purple;
    }
    resize();
    const animation = startVisibleAnimation(canvas, time => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      if (view === "wave") {
        traces.forEach(({ node, data }, index) => {
          node.getFloatTimeDomainData(data);
          ctx.beginPath();
          for (let point = 0; point < 180; point++) {
            const x = point * width / 179;
            const sample = data[Math.floor(point * (data.length - 1) / 179)];
            const y = height * (.5 - Math.max(-1, Math.min(1, sample * 1.4)) * .46);
            if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = index === 1 ? purple : cyan;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 9;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
        return;
      }

      mono.getFloatFrequencyData(frequency);
      const decay = Math.min(.12, lastTime ? (time - lastTime) / 1000 * .6 : 0);
      lastTime = time;
      const floor = height - 3;
      for (let i = 0; i < BANDS; i++) {
        let peak = -96;
        for (let j = starts[i]; j < Math.max(starts[i] + 1, starts[i + 1]); j++) peak = Math.max(peak, frequency[j] ?? -96);
        levels[i] = Math.max(0, Math.min(1, (peak + 82) / 70));
        held[i] = Math.max(levels[i], held[i] - decay);
      }
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, cyan); gradient.addColorStop(1, purple);
      const plot = (values: Float32Array) => {
        ctx.beginPath();
        values.forEach((value, index) => {
          const x = width * index / (BANDS - 1);
          const y = floor - value * (height - 8);
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
      };
      plot(levels);
      ctx.lineTo(width, floor); ctx.lineTo(0, floor); ctx.closePath();
      ctx.globalAlpha = .19; ctx.fillStyle = gradient; ctx.fill(); ctx.globalAlpha = 1;
      plot(held);
      ctx.strokeStyle = purple; ctx.globalAlpha = .65; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      plot(levels);
      ctx.strokeStyle = gradient; ctx.shadowColor = cyan; ctx.shadowBlur = 8; ctx.lineWidth = 1.5; ctx.stroke(); ctx.shadowBlur = 0;
    }, { maxFps: 35, reducedFps: 12, resize });
    return () => animation.stop();
  }, [view, mono, left, right, playing, theme]);

  return <div className="beta-scope" data-view={view} aria-hidden="true">
    <canvas ref={scope} />
    {view === "spectrum" && <div className="beta-scope-scale">{TICKS.map(hz =>
      <span key={hz} style={{ left: `${Math.log(hz / 25) / Math.log(HIGH_LOW_RATIO) * 100}%` }}>{hz < 1000 ? hz : `${hz / 1000}k`}</span>
    )}</div>}
  </div>;
}
