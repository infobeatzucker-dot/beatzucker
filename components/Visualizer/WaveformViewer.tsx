"use client";

import { useEffect, useRef } from "react";

interface Props {
  isProcessing: boolean;
  hasPostData: boolean;
  analyser?: AnalyserNode | null;
}

function generateWaveform(samples: number, seed: number): Float32Array {
  const data = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x        = i / samples;
    const main     = Math.sin(x * Math.PI * 6 + seed) * 0.6;
    const harmony  = Math.sin(x * Math.PI * 14 + seed * 0.7) * 0.25;
    const detail   = (Math.random() - 0.5) * 0.15;
    const envelope = Math.sin(x * Math.PI);
    data[i] = (main + harmony + detail) * envelope;
  }
  return data;
}

export default function WaveformViewer({ isProcessing, hasPostData, analyser }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number>(0);
  const tRef        = useRef(0);
  const preWaveRef  = useRef<Float32Array | null>(null);

  useEffect(() => { preWaveRef.current = generateWaveform(1000, 42); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      tRef.current += 0.016;
      const t  = tRef.current;
      const W  = canvas.width;
      const H  = canvas.height;

      ctx.clearRect(0, 0, W, H);

      const midY = H / 2;

      // Grid center line
      ctx.strokeStyle = "rgba(69,77,104,0.3)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();
      ctx.setLineDash([]);

      if (analyser) {
        // ── Real time-domain data (oscilloscope) ────────────────
        const td = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(td);

        const drawReal = (color: string, opacity: number, gainBoost = 1.0) => {
          ctx.strokeStyle  = color;
          ctx.lineWidth    = 1.5;
          ctx.globalAlpha  = opacity;
          ctx.shadowBlur   = 6;
          ctx.shadowColor  = color;
          ctx.beginPath();
          for (let i = 0; i < td.length; i++) {
            const x = (i / td.length) * W;
            const s = ((td[i] - 128) / 128) * gainBoost;
            const y = midY - s * midY * 0.85;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur  = 0;
          ctx.globalAlpha = 1;
        };

        drawReal("#8b5cf6", 0.6);
        if (hasPostData) drawReal("#38bdf8", 0.8, 1.3);
      } else {
        // ── Static simulation ────────────────────────────────────
        const preWave = preWaveRef.current;
        if (!preWave) { animRef.current = requestAnimationFrame(draw); return; }

        const drawWave = (wave: Float32Array, color: string, opacity: number, gainBoost = 1.0) => {
          const step = Math.max(1, Math.floor(wave.length / W));
          ctx.beginPath();
          ctx.strokeStyle  = color;
          ctx.lineWidth    = 1.5;
          ctx.globalAlpha  = opacity;
          for (let px = 0; px < W; px++) {
            const idx    = Math.floor((px / W) * wave.length);
            const sample = wave[idx] * gainBoost;
            const y      = midY - sample * midY * 0.85;
            px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
          }
          ctx.stroke();
          ctx.globalAlpha = opacity * 0.15;
          ctx.fillStyle   = color;
          ctx.beginPath();
          for (let px = 0; px < W; px++) {
            const idx    = Math.floor((px / W) * wave.length);
            const sample = wave[idx] * gainBoost;
            const y      = midY - sample * midY * 0.85;
            px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
          }
          ctx.lineTo(W, midY); ctx.lineTo(0, midY); ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          void step;
        };

        drawWave(preWave, "#8b5cf6", 0.7);
        if (hasPostData || isProcessing) {
          const gain = hasPostData ? 1.4 : 1.0 + Math.abs(Math.sin(t * 2)) * 0.4;
          drawWave(preWave, "#38bdf8", hasPostData ? 0.8 : 0.4, gain);
        }

        // Idle playhead
        if (!isProcessing) {
          const playX = (t * 30) % W;
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(playX, 0, 1, H);
        }
      }

      // RMS envelope (only in simulated mode)
      if (!analyser) {
        const wave = preWaveRef.current;
        if (wave) {
          ctx.strokeStyle = "rgba(56,189,248,0.25)";
          ctx.lineWidth   = 1;
          ctx.beginPath();
          const ws = Math.floor(wave.length / W);
          for (let px = 0; px < W; px++) {
            const si = Math.floor((px / W) * wave.length);
            let rms  = 0;
            for (let j = 0; j < ws; j++) { const s = wave[si + j] || 0; rms += s * s; }
            rms        = Math.sqrt(rms / ws);
            const y    = midY - rms * midY * 0.85;
            px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
          }
          ctx.stroke();
        }
      }

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
  }, [isProcessing, hasPostData, analyser]);

  return <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />;
}
