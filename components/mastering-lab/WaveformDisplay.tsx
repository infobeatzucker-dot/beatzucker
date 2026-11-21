import { useEffect, useRef } from "react";
import type { Waveform } from "./settings";
import styles from "./lab.module.css";

export function WaveformDisplay({ waveform, from, to, color, grid }: {
  waveform: Waveform | undefined;
  from: number;
  to: number;
  color: string;
  grid: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !waveform) return;
    const draw = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (!width || !height) return;
      canvas.width = width;
      canvas.height = height;
      const count = waveform.minimum.length;
      const first = Math.floor(from * count);
      const last = Math.min(count, Math.ceil(to * count));
      const columns = Math.min(width, last - first);
      if (!columns) return;
      const top = new Float32Array(columns);
      const bottom = new Float32Array(columns);
      const y = (sample: number) => height * (.5 - Math.max(-1, Math.min(sample, 1)) * .45);
      for (let column = 0; column < columns; column++) {
        const start = first + Math.floor(column * (last - first) / columns);
        const end = first + Math.floor((column + 1) * (last - first) / columns);
        let min = Infinity, max = -Infinity;
        for (let i = start; i < end; i++) {
          min = Math.min(min, waveform.minimum[i]);
          max = Math.max(max, waveform.maximum[i]);
        }
        top[column] = y(max);
        bottom[column] = y(min);
      }
      const position = (column: number) => column * width / Math.max(1, columns - 1);
      const fill = ctx.createLinearGradient(0, 0, 0, height);
      fill.addColorStop(0, color + "DB");
      fill.addColorStop(.5, color + "5C");
      fill.addColorStop(1, color + "C0");
      ctx.beginPath();
      for (let x = 0; x < columns; x++) ctx.lineTo(position(x), top[x]);
      for (let x = columns - 1; x >= 0; x--) ctx.lineTo(position(x), bottom[x]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = ratio * .65;
      for (const edge of [top, bottom]) {
        ctx.beginPath();
        for (let x = 0; x < columns; x++) ctx.lineTo(position(x), edge[x]);
        ctx.stroke();
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [waveform, from, to, color, grid]);
  return <canvas className={styles.waveCanvas} ref={ref} style={{ "--wave-grid": grid } as React.CSSProperties} aria-hidden="true" />;
}
