"use client";

import { useEffect, useRef } from "react";

interface Props {
  integrated: number;
  truePeak: number;
  isProcessing: boolean;
  analyser?: AnalyserNode | null;
}

const PLATFORM_TARGETS: { label: string; lufs: number; color: string }[] = [
  { label: "Spotify", lufs: -14, color: "#1DB954" },
  { label: "Apple",   lufs: -16, color: "#FC3C44" },
  { label: "YouTube", lufs: -14, color: "#FF0000" },
  { label: "Club",    lufs:  -9, color: "#8b5cf6" },
];

function dbToY(db: number, H: number, minDb = -30, maxDb = 0): number {
  return H - ((db - minDb) / (maxDb - minDb)) * H;
}

export default function LUFSMeter({ integrated, truePeak, isProcessing, analyser }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const tRef         = useRef(0);
  const rmsHistory   = useRef<number[]>([]);

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

      const MIN_DB = -30;
      const MAX_DB = 0;

      let momentary: number;
      let shortTerm: number;

      if (analyser) {
        // ── Real RMS from Web Audio ─────────────────────────────
        const td = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(td);

        let sum = 0;
        for (let i = 0; i < td.length; i++) {
          const s = (td[i] - 128) / 128;
          sum += s * s;
        }
        const rms = Math.sqrt(sum / td.length);
        // Convert RMS to approximate LUFS (simplified: 20*log10(rms) - 0.7 offset)
        const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -70;
        rmsHistory.current.push(rmsDb);
        if (rmsHistory.current.length > 180) rmsHistory.current.shift(); // ~3s at 60fps

        momentary = rmsDb;
        shortTerm = rmsHistory.current.reduce((a, b) => a + b, 0) / rmsHistory.current.length;
      } else {
        // ── Simulation ──────────────────────────────────────────
        momentary = isProcessing
          ? integrated + Math.sin(t * 8) * 3 + Math.random()
          : integrated + Math.sin(t * 2) * 0.5;
        shortTerm = isProcessing
          ? integrated + Math.sin(t * 3) * 1.5
          : integrated;
      }

      const meterW = (W - 60) / 3 - 4;
      const meters = [
        { label: "M", value: momentary, x: 0 },
        { label: "S", value: shortTerm, x: meterW + 4 },
        { label: "I", value: integrated, x: (meterW + 4) * 2 },
      ];

      meters.forEach(({ label, value, x }) => {
        const norm = Math.max(0, Math.min(1, (value - MIN_DB) / (MAX_DB - MIN_DB)));
        const barH = norm * H;
        const barY = H - barH;

        // Background
        ctx.fillStyle = "rgba(20,24,32,0.8)";
        ctx.fillRect(x, 0, meterW, H);

        // Color zones
        const zones = [
          { start: 0,    end: 0.6,  color: "#4ade80" },
          { start: 0.6,  end: 0.8,  color: "#facc15" },
          { start: 0.8,  end: 0.9,  color: "#fb923c" },
          { start: 0.9,  end: 1.0,  color: "#ff4757" },
        ];

        zones.forEach(({ start, end, color }) => {
          const zY       = H - end * H;
          const zH       = (end - start) * H;
          const fillStart = Math.max(zY, barY);
          const fillH    = Math.max(0, zY + zH - fillStart);
          if (fillH > 0 && barY < zY + zH) {
            ctx.fillStyle = color;
            ctx.fillRect(x, fillStart, meterW, fillH);
          }
        });

        // Platform targets
        PLATFORM_TARGETS.forEach(({ lufs, color }) => {
          if (lufs >= MIN_DB && lufs <= MAX_DB) {
            const lineY = dbToY(lufs, H, MIN_DB, MAX_DB);
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.moveTo(x, lineY); ctx.lineTo(x + meterW, lineY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });

        // Label + value
        ctx.fillStyle  = "rgba(69,77,104,0.9)";
        ctx.font       = "bold 8px monospace";
        ctx.textAlign  = "center";
        ctx.fillText(label, x + meterW / 2, 10);

        ctx.fillStyle = value > -6 ? "#ff4757" : value > -12 ? "#facc15" : "#38bdf8";
        ctx.font      = "7px monospace";
        ctx.fillText(`${value.toFixed(1)}`, x + meterW / 2, H - 4);
        ctx.textAlign  = "left";
      });

      // True Peak panel
      const tpX = (meterW + 4) * 3 + 4;
      ctx.fillStyle = "rgba(20,24,32,0.6)";
      ctx.fillRect(tpX, 0, 56, H);
      ctx.fillStyle = "rgba(69,77,104,0.9)";
      ctx.font      = "7px monospace";
      ctx.fillText("TRUE", tpX + 4, 10);
      ctx.fillText("PEAK", tpX + 4, 19);
      ctx.fillStyle = truePeak > -1 ? "#ff4757" : "#38bdf8";
      ctx.font      = "bold 9px monospace";
      ctx.fillText(`${truePeak.toFixed(1)}`, tpX + 4, H / 2 + 4);
      ctx.fillStyle = "rgba(69,77,104,0.7)";
      ctx.font      = "7px monospace";
      ctx.fillText("dBTP", tpX + 4, H / 2 + 14);

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
  }, [integrated, truePeak, isProcessing, analyser]);

  return <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />;
}
