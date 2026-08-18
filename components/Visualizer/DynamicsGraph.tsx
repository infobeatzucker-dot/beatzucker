"use client";

import { useEffect, useRef } from "react";

interface Props {
  drValue: number;
  crestFactor: number;
  isProcessing: boolean;
}

export default function DynamicsGraph({ drValue, crestFactor, isProcessing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      tRef.current += 0.016;
      const t = tRef.current;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Input/Output gain reduction simulation
      const sections = 20;
      const sectionW = W / sections;

      for (let i = 0; i < sections; i++) {
        const x = i * sectionW;
        // Simulate compression gain reduction
        const inputLevel = -6 + Math.sin(t * 2 + i * 0.4) * 8 * (isProcessing ? 1.5 : 1);
        const threshold = -12;
        const ratio = 2.5;
        const gr = inputLevel > threshold
          ? (inputLevel - threshold) * (1 - 1 / ratio)
          : 0;

        const norm = Math.min(1, Math.abs(gr) / 12);
        const barH = norm * (H * 0.6);
        const barY = H * 0.15;

        // GR bar (showing compression amount)
        const alpha = isProcessing ? 0.8 : 0.5;
        const grColor = norm > 0.5
          ? `rgba(255,71,87,${alpha})`
          : norm > 0.25
          ? `rgba(250,204,21,${alpha})`
          : `rgba(56,189,248,${alpha})`;

        ctx.fillStyle = grColor;
        ctx.fillRect(x + 1, barY, sectionW - 2, barH);
      }

      // DR bar
      const drNorm = Math.min(1, drValue / 20);
      const drBarW = drNorm * (W - 40);

      ctx.fillStyle = "rgba(20,24,32,0.8)";
      ctx.fillRect(20, H * 0.78, W - 40, 8);

      const drGrad = ctx.createLinearGradient(20, 0, W - 40, 0);
      drGrad.addColorStop(0, "#ff4757");
      drGrad.addColorStop(0.4, "#facc15");
      drGrad.addColorStop(1, "#4ade80");
      ctx.fillStyle = drGrad;
      ctx.fillRect(20, H * 0.78, drBarW, 8);

      // Labels
      ctx.fillStyle = "rgba(69,77,104,0.9)";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText("GR", 2, 12);

      ctx.fillStyle = drValue >= 14 ? "#4ade80" : drValue >= 10 ? "#facc15" : "#ff4757";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`DR${drValue.toFixed(0)}`, W / 2, H * 0.78 - 4);

      ctx.fillStyle = "rgba(69,77,104,0.7)";
      ctx.font = "7px monospace";
      ctx.fillText(`CF: ${crestFactor.toFixed(1)} dB`, W / 2, H - 4);

      animRef.current = requestAnimationFrame(draw);
    };

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height - 24;
    };
    resize();

    animRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [drValue, crestFactor, isProcessing]);

  return <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />;
}
