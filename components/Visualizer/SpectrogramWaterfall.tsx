"use client";


import { uiColor } from "@/lib/uiTheme";
import { colorRgb,getUiTheme } from "@/lib/uiTheme";
import { useUiThemeSnapshot } from "@/lib/useUiThemeSnapshot";
/**
 * SpectrogramWaterfall
 * Rolling 2D time-frequency spectrogram (like Logic Pro / iZotope RX).
 * X-axis = frequency (log scale), Y-axis = time (newest at bottom, scrolls up).
 * Color = amplitude:  black → dark-blue → cyan → yellow → white
 */

import { useEffect, useRef } from "react";
import { startVisibleAnimation } from "@/lib/visibleAnimation";

interface Props {
  analyser?: AnalyserNode | null;
  isProcessing?: boolean;
}

// Heat colormap: 0=black, 0.3=blue-purple, 0.6=cyan, 0.8=yellow, 1=white
function heatColor(v: number,palette:number[][]|null=null): [number, number, number] {
  const c = Math.max(0, Math.min(1, v));
  if(palette){const position=c*3,index=Math.min(2,Math.floor(position)),amount=position-index;return palette[index].map((value,i)=>Math.round(value+(palette[index+1][i]-value)*amount)) as [number,number,number];}
  if (c < 0.25) { const t = c / 0.25;        return [Math.round(t * 30),   0,                    Math.round(t * 120)]; }
  if (c < 0.50) { const t = (c - 0.25) / 0.25; return [Math.round(30 + t * 94),  Math.round(t * 60),  Math.round(120 + t * 135)]; }
  if (c < 0.75) { const t = (c - 0.50) / 0.25; return [Math.round(124 - t * 124), Math.round(60 + t * 169), Math.round(255 - t * 59)]; }
  const t = (c - 0.75) / 0.25;
  return [Math.round(t * 255), Math.round(229 + t * 26), Math.round(196 - t * 196)];
}

export default function SpectrogramWaterfall({ analyser, isProcessing }: Props) {
  const uiTheme=useUiThemeSnapshot();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const tRef       = useRef(0);
  const offscreenRef = useRef<OffscreenCanvas | null>(null);

  useEffect(() => {
    const theme=getUiTheme(uiTheme),palette=uiTheme==='original'?null:[theme.inset,theme.accent,theme.second,theme.face1].map(colorRgb);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height - 24);
      // Reset offscreen
      offscreenRef.current = new OffscreenCanvas(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) {  return; }

      tRef.current += 0.016;

      const offscreen = offscreenRef.current;
      if (!offscreen || offscreen.width !== W || offscreen.height !== H) {
        offscreenRef.current = new OffscreenCanvas(W, H);
      }
      const offCtx = offscreenRef.current!.getContext("2d")!;

      // Shift existing content up by 1 px
      const imageData = offCtx.getImageData(0, 1, W, H - 1);
      offCtx.putImageData(imageData, 0, 0);

      // Get new frequency row
      const NUM_BINS = W;
      const rowData  = new Uint8ClampedArray(NUM_BINS * 4);

      if (analyser) {
        const fd = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fd);
        const nyquist = analyser.context.sampleRate / 2;

        for (let x = 0; x < NUM_BINS; x++) {
          // Log-scale frequency mapping
          const freqLo = 20  * Math.pow(nyquist / 20, x / NUM_BINS);
          const freqHi = 20  * Math.pow(nyquist / 20, (x + 1) / NUM_BINS);
          const binLo  = Math.max(0, Math.floor(freqLo / nyquist * fd.length));
          const binHi  = Math.min(fd.length - 1, Math.ceil(freqHi  / nyquist * fd.length));

          let sum = 0, cnt = 0;
          for (let b = binLo; b <= binHi; b++) { sum += fd[b]; cnt++; }
          const val = cnt > 0 ? sum / cnt / 255 : 0;

          const [r, g, b] = heatColor(val * 1.4,palette); // slight boost for visibility
          const i = x * 4;
          rowData[i] = r; rowData[i + 1] = g; rowData[i + 2] = b; rowData[i + 3] = 255;
        }
      } else {
        // Simulated: animated noise floor with musical-ish peaks
        const t = tRef.current;
        for (let x = 0; x < NUM_BINS; x++) {
          const fx = x / NUM_BINS;
          const base = Math.max(0,
            0.15 * Math.exp(-3 * fx) +
            0.08 * Math.sin(fx * Math.PI * 2) * (0.5 + 0.5 * Math.sin(t * (isProcessing ? 2.5 : 0.5))) +
            (Math.random() * 0.04)
          );
          const [r, g, b] = heatColor(base,palette);
          const i = x * 4;
          rowData[i] = r; rowData[i + 1] = g; rowData[i + 2] = b; rowData[i + 3] = 255;
        }
      }

      // Write new row at bottom
      const newRow = new ImageData(rowData, NUM_BINS, 1);
      offCtx.putImageData(newRow, 0, H - 1);

      // Draw offscreen to visible canvas
      ctx.drawImage(offscreenRef.current!, 0, 0);

      // Frequency axis labels
      ctx.fillStyle = uiColor("rgba(255,255,255,0.3)");
      ctx.font = "8px monospace";
      const freqMarkers = [100, 500, 1000, 5000, 10000, 20000];
      freqMarkers.forEach((f) => {
        if (!analyser) return;
        const nyquist = analyser.context.sampleRate / 2;
        const x = Math.log(f / 20) / Math.log(nyquist / 20) * W;
        ctx.fillStyle = uiColor("rgba(255,255,255,0.2)");
        ctx.fillRect(x, 0, 1, H);
        ctx.fillStyle = uiColor("rgba(255,255,255,0.5)");
        ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, H - 4);
      });


    };


    const animation = startVisibleAnimation(canvas, draw, { continuous: Boolean(analyser) || isProcessing, resize });
    return () => {
      animation.stop();
      window.removeEventListener("resize", resize);
    };
  }, [analyser, isProcessing,uiTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded"
      style={{ display: "block", imageRendering: "pixelated" }}
    />
  );
}
