"use client";

import { useEffect, useRef } from "react";

interface Props {
  isProcessing: boolean;
  hasPostData: boolean;
  analyser?: AnalyserNode | null;
}

const FREQ_LABELS = ["20", "50", "100", "200", "500", "1k", "2k", "5k", "10k", "20k"];
const NUM_BARS = 80;

function generateNoiseFloor(bars: number, t: number): number[] {
  const data: number[] = new Array(bars);
  for (let i = 0; i < bars; i++) {
    const x    = i / bars;
    const base = -60 + 20 * Math.exp(-3 * x) + 10 * Math.sin(x * Math.PI * 2) * Math.sin(t * 0.5 + i * 0.3);
    const texture = Math.sin(i * 1.73 + t * 2.1) * 1.4 + Math.sin(i * .41 - t * 1.2) * .8;
    data[i]    = base + texture;
  }
  return data;
}

export default function SpectrumAnalyzer({ isProcessing, hasPostData, analyser }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const tRef       = useRef(0);
  const peakHold   = useRef<Float32Array>(new Float32Array(NUM_BARS).fill(-80));
  const peakDecay  = useRef<Float32Array>(new Float32Array(NUM_BARS).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      tRef.current += 0.016;
      const t = tRef.current;

      ctx.clearRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(139,92,246,0.06)";
      ctx.lineWidth   = 1;
      for (let db = -20; db >= -80; db -= 20) {
        const y = ((db + 0) / -80) * (H - 20);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = "rgba(69,77,104,0.6)";
        ctx.font      = "8px monospace";
        ctx.fillText(`${db}`, 2, y - 2);
      }

      // ── Get bar data from Web Audio or simulation ──
      const barDbPre  = new Array<number>(NUM_BARS);
      const barDbPost = hasPostData ? new Array<number>(NUM_BARS) : null;

      if (analyser) {
        // Real FFT data (log-scale mapped)
        const fd    = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fd);
        const sampleRate  = analyser.context.sampleRate;
        const nyquist     = sampleRate / 2;

        for (let i = 0; i < NUM_BARS; i++) {
          const freqLo = 20  * Math.pow(nyquist / 20, i / NUM_BARS);
          const freqHi = 20  * Math.pow(nyquist / 20, (i + 1) / NUM_BARS);
          const binLo  = Math.max(0, Math.floor(freqLo / nyquist * fd.length));
          const binHi  = Math.min(fd.length - 1, Math.ceil(freqHi / nyquist * fd.length));

          let sum = 0, cnt = 0;
          for (let b = binLo; b <= binHi; b++) { sum += fd[b]; cnt++; }
          const avg    = cnt > 0 ? sum / cnt : 0;
          barDbPre[i]  = (avg / 255) * 80 - 80; // map 0-255 → -80..0 dB
        }
        if (barDbPost) {
          // Slight post-master boost simulation when real master isn't playing
          for (let i = 0; i < NUM_BARS; i++) barDbPost[i] = barDbPre[i] + 4;
        }
      } else {
        // Simulated
        const speed = isProcessing ? 3 : 1;
        const pre   = generateNoiseFloor(NUM_BARS, t * speed);
        for (let i = 0; i < NUM_BARS; i++) barDbPre[i] = pre[i];
        if (barDbPost) {
          const post = generateNoiseFloor(NUM_BARS, t * speed + 1.5).map((v) => v + 6);
          for (let i = 0; i < NUM_BARS; i++) barDbPost[i] = post[i];
        }
      }

      const barW = (W - 4) / NUM_BARS;

      for (let i = 0; i < NUM_BARS; i++) {
        const x      = i * barW + 2;
        const rawDb  = barDbPre[i];
        const normDb = Math.max(0, Math.min(1, (rawDb + 80) / 80));
        const barH   = normDb * (H - 20);
        const y      = H - 20 - barH;

        // Frequency color gradient: purple → cyan
        const frac = i / NUM_BARS;
        const r    = frac < 0.26 ? 226 : frac < 0.62 ? 128 : 55;
        const g    = frac < 0.26 ? 66 : frac < 0.62 ? 91 : 196;
        const b    = frac < 0.26 ? 215 : frac < 0.62 ? 255 : 255;

        const grad = ctx.createLinearGradient(x, y, x, H - 20);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.75)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0.1)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW - 1, barH);

        // Post overlay (cyan)
        if (barDbPost) {
          const postNorm = Math.max(0, Math.min(1, (barDbPost[i] + 80) / 80));
          const postH    = postNorm * (H - 20);
          ctx.fillStyle  = "rgba(56,189,248,0.35)";
          ctx.fillRect(x, H - 20 - postH, barW - 1, postH);
        }

        // Peak hold
        if (rawDb > peakHold.current[i]) {
          peakHold.current[i]  = rawDb;
          peakDecay.current[i] = 0;
        } else {
          peakDecay.current[i]  += 0.02;
          peakHold.current[i]   -= peakDecay.current[i];
        }
        const peakNorm = Math.max(0, Math.min(1, (peakHold.current[i] + 80) / 80));
        const peakY    = H - 20 - peakNorm * (H - 20);
        ctx.fillStyle  = "rgba(255,255,255,0.65)";
        ctx.fillRect(x, peakY, barW - 1, 1.5);
      }

      // Freq labels
      ctx.fillStyle = "rgba(69,77,104,0.8)";
      ctx.font      = "8px monospace";
      FREQ_LABELS.forEach((label, i) => {
        const x = (i / (FREQ_LABELS.length - 1)) * (W - 20) + 10;
        ctx.fillText(label, x - 6, H - 4);
      });

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

  return (
    <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />
  );
}
