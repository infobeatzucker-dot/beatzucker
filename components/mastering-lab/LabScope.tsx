import { useEffect, useRef } from "react";
import type { LabAudio } from "./audio";
import { toDb, type Module, type Settings } from "./settings";
import styles from "./lab.module.css";

const low = 30, high = 18000;
export const spectrumTicks = [[low, "30 Hz"], [100, "100 Hz"], [500, "500 Hz"], [2000, "2 kHz"], [high, "18 kHz"]] as const;
export const spectrumPosition = (hz: number) => Math.log(hz / low) / Math.log(high / low);
const hz = Float32Array.from({ length: 240 }, (_, i) => low * (high / low) ** (i / 239));
const trailWidth = 144;
const trailRows = 24;
const rgb = (color: string) => [1, 3, 5].map(start => Number.parseInt(color.slice(start, start + 2), 16));

export function LabScope({ audio, selected, running, accent, second, eqColor, spectrumOnly, label, eq, eqFrequency, eqQ, highpass, eqActive }: {
  audio: LabAudio | null;
  selected: Module;
  running: boolean;
  accent: string;
  second: string;
  eqColor: string;
  spectrumOnly: boolean;
  label: string;
  eq: number[];
  eqFrequency: Settings["eqFrequency"];
  eqQ: Settings["eqQ"];
  highpass: number;
  eqActive: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const responseContext = useRef<OfflineAudioContext | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const sizes = { width: 0, height: 0 };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      sizes.width = canvas.clientWidth;
      sizes.height = canvas.clientHeight;
      canvas.width = Math.round(sizes.width * ratio);
      canvas.height = Math.round(sizes.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const input = new Float32Array(audio?.input.frequencyBinCount ?? 1024);
    const output = new Float32Array(audio?.output.frequencyBinCount ?? 1024);
    const trailCanvas = document.createElement("canvas");
    trailCanvas.width = trailWidth;
    trailCanvas.height = trailRows;
    const trail = trailCanvas.getContext("2d");
    const trailPixels = trail?.createImageData(trailWidth, trailRows);
    const [ar, ag, ab] = rgb(accent);
    const [sr, sg, sb] = rgb(second);
    let lastTrail = -Infinity;
    const duckHistory = new Float32Array(100);
    const duckHits = new Uint8Array(duckHistory.length);
    let lastHit = audio?.reduction.duckTriggers ?? 0;
    let historyIndex = 0;
    const response = new Float32Array(hz.length);
    const phase = new Float32Array(hz.length);
    const combined = new Float32Array(hz.length);
    if (selected === "eq" && eqActive && typeof OfflineAudioContext !== "undefined") {
      const context = responseContext.current ??= new OfflineAudioContext(1, 1, audio?.context.sampleRate ?? 48000);
      eqFrequency.forEach((frequency, index) => {
        const filter = context.createBiquadFilter();
        filter.type = index === 0 ? "lowshelf" : index === 3 ? "highshelf" : "peaking";
        filter.frequency.value = Math.min(frequency, context.sampleRate * .49);
        filter.Q.value = eqQ[index];
        filter.gain.value = eq[index];
        filter.getFrequencyResponse(hz, response, phase);
        combined.forEach((_, i) => { if (Number.isFinite(response[i])) combined[i] += toDb(response[i]); });
      });
      if (highpass > 0) {
        const filter = context.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = highpass;
        filter.Q.value = .707;
        filter.getFrequencyResponse(hz, response, phase);
        combined.forEach((_, i) => { if (Number.isFinite(response[i])) combined[i] += toDb(response[i]); });
      }
    }
    const draw = (now = performance.now()) => {
      const { width, height } = sizes;
      ctx.clearRect(0, 0, width, height);
      const spectrum = spectrumOnly || selected === "eq" || selected === "input" || selected === "saturation" || selected === "finalEq";
      const plotHeight = spectrum && running ? Math.round(height * .72) : height;
      if (audio && running && spectrum) {
        audio.input.getFloatFrequencyData(input);
        audio.output.getFloatFrequencyData(output);
        const step = audio.output.fftSize / audio.context.sampleRate;
        const magnitudeAt = (data: Float32Array, frequency: number) => {
          const bin = Math.min(data.length - 1, frequency * step);
          const i = Math.floor(bin);
          const lower = Number.isFinite(data[i]) ? data[i] : -110;
          const higher = Number.isFinite(data[i + 1]) ? data[i + 1] : lower;
          return Math.max(0, Math.min(1, (lower + (higher - lower) * (bin - i) + 83) / 75));
        };
        if (trail && trailPixels && now - lastTrail >= 46) {
          lastTrail = now;
          const bytes = trailPixels.data;
          bytes.copyWithin(0, trailWidth * 4);
          const offset = (trailRows - 1) * trailWidth * 4;
          for (let i = 0; i < trailWidth; i++) {
            const amount = magnitudeAt(output, hz[Math.round(i / (trailWidth - 1) * (hz.length - 1))]);
            const x = offset + i * 4;
            bytes[x] = sr + (ar - sr) * amount;
            bytes[x + 1] = sg + (ag - sg) * amount;
            bytes[x + 2] = sb + (ab - sb) * amount;
            bytes[x + 3] = Math.round(amount ** 1.45 * 217);
          }
          trail.putImageData(trailPixels, 0, 0);
        }
        if (trail) {
          ctx.drawImage(trailCanvas, 0, plotHeight + 2, width, Math.max(0, height - plotHeight - 2));
          ctx.fillStyle = second + "50";
          ctx.fillRect(0, plotHeight, width, 1);
        }
        const trace = (data: Float32Array, color: string, dry: boolean) => {
          ctx.beginPath();
          for (let i = 0; i < hz.length; i++) {
            const magnitude = magnitudeAt(data, hz[i]);
            const x = i / (hz.length - 1) * width;
            const y = plotHeight * (1 - magnitude * .91);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineWidth = dry ? 1.4 : 2;
          ctx.strokeStyle = color;
          ctx.setLineDash(dry ? [4, 4] : []);
          ctx.stroke();
          ctx.setLineDash([]);
          if (!dry) {
            const fill = ctx.createLinearGradient(0, 0, 0, plotHeight);
            fill.addColorStop(0, color + "66");
            fill.addColorStop(1, color + "14");
            ctx.lineTo(width, plotHeight);
            ctx.lineTo(0, plotHeight);
            ctx.fillStyle = fill;
            ctx.fill();
          }
        };
        trace(output, accent, false);
        trace(input, second, true);
      }
      if (selected === "eq") {
        ctx.beginPath();
        for (let i = 0; i < hz.length; i++) {
          const x = i / (hz.length - 1) * width;
          const y = Math.max(3, Math.min(plotHeight - 3, plotHeight * (.5 - combined[i] / 22)));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = eqColor;
        ctx.stroke();
      } else if (selected === "stereo" && !spectrumOnly) {
        const correlation = running ? audio?.reduction.correlation ?? 0 : 0;
        ctx.fillStyle = second + "35";
        ctx.fillRect(width * .08, height * .44, width * .84, 12);
        ctx.fillStyle = accent;
        ctx.fillRect(width * (.5 + .42 * correlation) - 2, height * .44 - 9, 4, 30);
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(running ? correlation.toFixed(2) : "—", width / 2, height * .76);
      } else if (selected === "ducking" && !spectrumOnly) {
        const depth = running ? -toDb(audio?.reduction.ducking ?? 1) : 0;
        if (running && now - lastTrail >= 28) {
          lastTrail = now;
          duckHistory[historyIndex] = depth;
          const hits = audio?.reduction.duckTriggers ?? 0;
          duckHits[historyIndex] = Number(hits !== lastHit);
          lastHit = hits;
          historyIndex = (historyIndex + 1) % duckHistory.length;
        }
        const top = 18, plot = height - 44;
        ctx.font = "11px monospace";
        for (const db of [0, 2, 4, 6, 8]) {
          const y = top + plot * db / 8;
          ctx.fillStyle = second + "44";
          ctx.fillRect(42, y, width - 42, 1);
          ctx.fillStyle = second;
          ctx.textAlign = "left";
          ctx.fillText(`${db ? "−" : ""}${db} dB`, 4, y + 4);
        }
        ctx.beginPath();
        for (let i = 0; i < duckHistory.length; i++) {
          const x = 42 + i / (duckHistory.length - 1) * (width - 44);
          const y = top + plot * Math.min(1, duckHistory[(historyIndex + i) % duckHistory.length] / 8);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = second;
        for (let i = 0; i < duckHits.length; i++) {
          if (!duckHits[(historyIndex + i) % duckHits.length]) continue;
          const x = 42 + i / (duckHits.length - 1) * (width - 44);
          ctx.fillRect(x - 1, top - 8, 2, 6);
        }
        ctx.fillStyle = accent;
        ctx.textAlign = "right";
        ctx.fillText(`${depth >= .05 ? "−" : ""}${depth.toFixed(1)} dB`, width - 4, height - 6);
      } else if (!spectrum) {
        const reductions = selected === "dynamics" ? audio?.reduction.bands ?? [1, 1, 1, 1]
          : [selected === "bus" ? audio?.reduction.bus ?? 1
            : selected === "deesser" ? audio?.reduction.deesser ?? 1 : audio?.reduction.limit ?? 1];
        const gap = width / reductions.length;
        reductions.forEach((value, i) => {
          const reduction = running ? Math.abs(toDb(value)) : 0;
          const barHeight = Math.max(3, Math.min(height - 32, (height - 40) * reduction / 15));
          const barWidth = Math.min(70, gap * .4);
          const x = gap * (i + .5) - barWidth / 2;
          ctx.fillStyle = accent + "35";
          ctx.fillRect(x, 12, barWidth, height - 37);
          ctx.fillStyle = accent;
          ctx.fillRect(x, 12, barWidth, barHeight);
          ctx.font = "12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${reduction.toFixed(1)} dB`, x + barWidth / 2, height - 8);
        });
      }
    };
    const observer = new ResizeObserver(() => { resize(); draw(); });
    observer.observe(canvas);
    resize();
    if (running) {
      const animate = () => { draw(); frame = requestAnimationFrame(animate); };
      animate();
    } else draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [audio, selected, running, accent, second, eqColor, spectrumOnly, eq, eqFrequency, eqQ, highpass, eqActive]);
  return <canvas ref={ref} className={styles.canvas} role="img" aria-label={label} />;
}
