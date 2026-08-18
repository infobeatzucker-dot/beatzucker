"use client";

import { useEffect, useRef } from "react";

interface Props {
  stereoWidth: number;
  monoCompatibility: number;
  isProcessing: boolean;
  analyserL?: AnalyserNode | null;
  analyserR?: AnalyserNode | null;
}

export default function StereoField({
  stereoWidth,
  monoCompatibility,
  isProcessing,
  analyserL,
  analyserR,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const tRef         = useRef(0);
  const trailPoints  = useRef<{ x: number; y: number; age: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      tRef.current += 0.016;
      const t = tRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Fade trail
      ctx.fillStyle = "rgba(5,8,22,0.14)";
      ctx.fillRect(0, 0, W, H);

      const cx     = W / 2;
      const cy     = H / 2;
      const radius = Math.min(cx, cy) - 10;

      // Crosshair
      ctx.strokeStyle = "rgba(69,77,104,0.3)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
      ctx.moveTo(0, cy); ctx.lineTo(W, cy);
      ctx.stroke();

      // Diagonal guides
      ctx.strokeStyle = "rgba(69,77,104,0.15)";
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy + radius); ctx.lineTo(cx + radius, cy - radius);
      ctx.moveTo(cx - radius, cy - radius); ctx.lineTo(cx + radius, cy + radius);
      ctx.stroke();

      // Circle border
      ctx.strokeStyle = "rgba(139,92,246,0.1)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (analyserL && analyserR) {
        // ── Real stereo vectorscope ────────────────────────────
        const bufL = new Uint8Array(analyserL.fftSize);
        const bufR = new Uint8Array(analyserR.fftSize);
        analyserL.getByteTimeDomainData(bufL);
        analyserR.getByteTimeDomainData(bufR);

        const len   = Math.min(bufL.length, bufR.length);
        const step  = Math.max(1, Math.floor(len / 200)); // max 200 dots per frame

        for (let i = 0; i < len; i += step) {
          const L = (bufL[i] - 128) / 128;
          const R = (bufR[i] - 128) / 128;
          // M/S → X/Y: x = (L+R)/√2, y = (L−R)/√2
          const mx = (L + R) / Math.SQRT2;
          const my = (L - R) / Math.SQRT2;
          const x  = cx + mx * radius * 0.85;
          const y  = cy - my * radius * 0.85;
          trailPoints.current.push({ x, y, age: 0 });
        }
      } else {
        // ── Simulated Lissajous ────────────────────────────────
        const width    = Math.min(2, Math.max(0.1, stereoWidth));
        const numPts   = isProcessing ? 8 : 3;

        for (let i = 0; i < numPts; i++) {
          const phase = t * (2 + i * 0.5) + i * Math.PI / 4;
          const amp   = 0.3 + Math.random() * 0.5;
          const L     = Math.sin(phase) * amp;
          const R     = Math.sin(phase + width * 0.5) * amp;
          const x     = cx + ((L + R) / Math.SQRT2) * radius * 0.7;
          const y     = cy - ((L - R) / Math.SQRT2) * radius * 0.7;
          trailPoints.current.push({ x, y, age: 0 });
        }
      }

      // Draw + age trail
      trailPoints.current = trailPoints.current.filter((p) => {
        p.age += analyserL ? 0.08 : 0.05;
        const alpha = Math.max(0, 1 - p.age);
        const red = Math.round(72 + alpha * 70);
        const blue = 255;
        ctx.fillStyle  = `rgba(${red},190,${blue},${(alpha * 0.85).toFixed(2)})`;
        const size     = Math.max(0.5, 2 * (1 - p.age * 0.7));
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        return p.age < 1;
      });

      // Correlation meter bar
      const corrH = 4;
      const corrY = H - corrH - 2;
      ctx.fillStyle = "rgba(20,24,32,0.8)";
      ctx.fillRect(0, corrY, W, corrH);

      let corr = monoCompatibility;
      if (analyserL && analyserR) {
        // Calculate real correlation from trail
        const recent = trailPoints.current.slice(-50);
        if (recent.length > 4) {
          const mx  = recent.reduce((s, p) => s + p.x, 0) / recent.length;
          const my  = recent.reduce((s, p) => s + p.y, 0) / recent.length;
          const dx  = recent.reduce((s, p) => s + Math.abs(p.x - mx), 0);
          const dy  = recent.reduce((s, p) => s + Math.abs(p.y - my), 0);
          // Narrow vertical spread = mono-ish (high correlation)
          corr = Math.max(-1, Math.min(1, 1 - (dx / (dy + 0.001) - 1) * 0.5));
        }
      }

      const corrNorm  = (corr + 1) / 2;
      const corrColor = corr > 0.5 ? "#4ade80" : corr > 0 ? "#facc15" : "#ff4757";
      ctx.fillStyle = corrColor;
      ctx.fillRect(0, corrY, corrNorm * W, corrH);

      // Labels
      ctx.fillStyle  = "rgba(69,77,104,0.8)";
      ctx.font       = "8px monospace";
      ctx.textAlign  = "center";
      ctx.fillText("L",    cx - radius + 5, cy - 2);
      ctx.fillText("R",    cx + radius - 5, cy - 2);
      ctx.fillText("CORR", cx, corrY - 3);
      ctx.textAlign  = "left";

      animRef.current = requestAnimationFrame(draw);
    };

    const resize = () => {
      const rect    = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height - 24;
    };
    resize();
    animRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [stereoWidth, monoCompatibility, isProcessing, analyserL, analyserR]);

  return <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />;
}
