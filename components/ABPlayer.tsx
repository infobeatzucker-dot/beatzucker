"use client";

/**
 * ABPlayer — Professional A/B comparison player
 *
 * Visual features:
 *  • Decoded static waveform overview (full track, RMS bars)
 *  • Live real-time oscilloscope overlay (Web Audio AnalyserNode)
 *  • Large glowing A/B toggle pills with animated crossfade
 *  • Inline live spectrum strip
 *  • Smooth scrubber + keyboard shortcuts
 */

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

function formatTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  filename: string;
}

export default function ABPlayer({ filename }: Props) {
  const engine = useAudioEngine();

  // Canvas refs
  const waveCanvasRef     = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef     = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const vuLRef            = useRef<HTMLCanvasElement>(null);
  const vuRRef            = useRef<HTMLCanvasElement>(null);

  const scrubberRef  = useRef<HTMLDivElement>(null);
  const waveAreaRef  = useRef<HTMLDivElement>(null);
  const animRef      = useRef<number>(0);
  const isDragging   = useRef(false);

  // ── Draw static decoded waveform ───────────────────────────────────────────
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas || (!engine?.staticWaveform && !engine?.staticWaveformB)) return;

    const ctx  = canvas.getContext("2d")!;
    const W    = canvas.offsetWidth;
    const H    = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;

    const isB     = engine.mode === "B";
    // Use the B waveform when available in B mode, fall back to A
    const wf      = (isB && engine.staticWaveformB) ? engine.staticWaveformB : engine.staticWaveform;
    const peaks   = (isB && engine.peakWaveformB)   ? engine.peakWaveformB   : engine.peakWaveform;
    if (!wf) return;
    const bars    = wf.length;
    const barW    = W / bars;
    const color   = isB ? "#38bdf8" : "#8b5cf6";
    const progress = engine.currentTime / (engine.duration || 1);

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < bars; i++) {
      const x      = i * barW;
      const amp    = wf[i];
      const peak   = peaks?.[i] ?? 0;
      const isClip = peak > 0.98;
      const maxH   = H * 0.85;
      const h      = Math.max(1, amp * maxH * 3.5);
      const y      = (H - h) / 2;
      const isPast = i / bars < progress;

      if (isClip) {
        // Clipping: bright red regardless of mode/progress
        ctx.fillStyle = isPast ? "rgba(255,71,87,0.95)" : "rgba(255,71,87,0.5)";
      } else {
        const alpha = isPast ? 0.9 : 0.22;
        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0");
      }
      ctx.fillRect(x, y, Math.max(0.6, barW - 0.8), h);
    }

    // Playhead glow line
    const px   = progress * W;
    const grad = ctx.createLinearGradient(px - 2, 0, px + 2, 0);
    grad.addColorStop(0,   "transparent");
    grad.addColorStop(0.5, isB ? "#38bdf8" : "#8b5cf6");
    grad.addColorStop(1,   "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(px - 2, 0, 4, H);
  }, [engine?.staticWaveform, engine?.peakWaveform, engine?.staticWaveformB, engine?.peakWaveformB, engine?.currentTime, engine?.duration, engine?.mode]);

  // ── Live animation loop (oscilloscope + spectrum + VU) ─────────────────────
  useEffect(() => {
    const liveCanvas = liveCanvasRef.current;
    const specCanvas = spectrumCanvasRef.current;
    const vuL        = vuLRef.current;
    const vuR        = vuRRef.current;

    const draw = () => {
      const analyser   = engine?.analyserMono ?? null;
      const analyserL  = engine?.analyserL ?? null;
      const analyserR  = engine?.analyserR ?? null;
      const isPlaying  = engine?.isPlaying ?? false;

      // ── Oscilloscope ───────────────────────────────────────────
      if (liveCanvas) {
        const ctx = liveCanvas.getContext("2d")!;
        const W   = liveCanvas.width;
        const H   = liveCanvas.height;

        ctx.clearRect(0, 0, W, H);

        if (analyser && isPlaying) {
          const td = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(td);

          const isB  = engine?.mode === "B";
          const color = isB ? "#38bdf8" : "#8b5cf6";

          // Glow pass
          ctx.shadowBlur  = 8;
          ctx.shadowColor = color;
          ctx.strokeStyle = color + "cc";
          ctx.lineWidth   = 1.5;
          ctx.beginPath();
          for (let i = 0; i < td.length; i++) {
            const x = (i / td.length) * W;
            const y = ((td[i] - 128) / 128) * (H / 2) + H / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // ── Live spectrum strip ────────────────────────────────────
      if (specCanvas) {
        const ctx = specCanvas.getContext("2d")!;
        const W   = specCanvas.width;
        const H   = specCanvas.height;

        ctx.clearRect(0, 0, W, H);

        const fd = analyser ? (() => {
          const d = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(d);
          return d;
        })() : null;

        const NUM = 64;
        const bW  = W / NUM;

        for (let i = 0; i < NUM; i++) {
          let val = 0;
          if (fd) {
            // Log-scale mapping
            const lo = Math.floor(Math.pow(i / NUM, 2)       * fd.length);
            const hi = Math.floor(Math.pow((i + 1) / NUM, 2) * fd.length);
            let sum = 0, cnt = 0;
            for (let b = lo; b <= hi && b < fd.length; b++) { sum += fd[b]; cnt++; }
            val = cnt > 0 ? sum / cnt : 0;
          } else if (engine?.isPlaying) {
            val = 0;
          } else {
            // Idle decorative
            val = Math.max(0, 40 + Math.sin(i * 0.4) * 30 + Math.sin(Date.now() * 0.001 + i * 0.2) * 10);
          }

          const h    = (val / 255) * H;
          const hue  = 260 - (i / NUM) * 200;
          const r    = i < NUM * 0.3 ? 124 : i < NUM * 0.6 ? 60 : 0;
          const g    = i < NUM * 0.3 ? 111 : i < NUM * 0.6 ? 180 : 229;
          const b    = i < NUM * 0.3 ? 255 : i < NUM * 0.6 ? 200 : 196;
          ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
          ctx.fillRect(i * bW, H - h, Math.max(0.5, bW - 1), h);
        }
      }

      // ── VU meters ─────────────────────────────────────────────
      const drawVU = (canvas: HTMLCanvasElement | null, analyserNode: AnalyserNode | null) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        const W   = canvas.width;
        const H   = canvas.height;
        ctx.clearRect(0, 0, W, H);

        let rms = 0;
        if (analyserNode && engine?.isPlaying) {
          const td = new Uint8Array(analyserNode.fftSize);
          analyserNode.getByteTimeDomainData(td);
          let sum = 0;
          for (let i = 0; i < td.length; i++) {
            const s = (td[i] - 128) / 128;
            sum += s * s;
          }
          rms = Math.sqrt(sum / td.length);
        }

        const level = Math.min(1, rms * 4);
        const segments = 16;
        const gap = 2;
        const segH = (H - gap * (segments - 1)) / segments;

        for (let i = 0; i < segments; i++) {
          const y    = H - (i + 1) * segH - i * gap;
          const fill = i / segments < level;
          let r = 0, g = 229, b = 196;
          if (i > segments * 0.75) { r = 245; g = 200; b = 66; }
          if (i > segments * 0.9)  { r = 255; g =  71; b = 87; }
          ctx.fillStyle = fill
            ? `rgba(${r},${g},${b},0.9)`
            : `rgba(${r},${g},${b},0.08)`;
          ctx.fillRect(0, y, W, segH);
        }
      };

      drawVU(vuL, analyserL);
      drawVU(vuR, analyserR);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [engine]);

  // ── Scrubber ───────────────────────────────────────────────────────────────
  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent, ref?: React.RefObject<HTMLDivElement | null>) => {
    const bar = (ref ?? scrubberRef).current;
    if (!bar || !engine) return;
    const rect  = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    engine.seek(ratio * (engine.duration || 0));
  }, [engine]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (isDragging.current) handleScrub(e, waveAreaRef); };
    const onMouseUp   = ()              => { isDragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [handleScrub]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!engine) return;
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") { e.preventDefault(); engine.togglePlay(); }
      if (e.key === "a" || e.key === "A") engine.setMode("A");
      if (e.key === "b" || e.key === "B") engine.setMode("B");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  if (!engine) return null;

  const { isPlaying, currentTime, duration, mode, masterUnavailable, masteredUrl } = engine;
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const isB      = mode === "B";
  const accent   = isB ? "var(--accent-cyan)" : "var(--accent-purple)";

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        background: "rgba(8,10,18,0.85)",
        border: `1px solid ${isB ? "rgba(56,189,248,0.25)" : "rgba(139,92,246,0.25)"}`,
        backdropFilter: "blur(20px)",
        boxShadow: isB
          ? "0 0 40px rgba(56,189,248,0.08), inset 0 1px 0 rgba(56,189,248,0.1)"
          : "0 0 40px rgba(139,92,246,0.08), inset 0 1px 0 rgba(139,92,246,0.1)",
        transition: "border-color 0.4s, box-shadow 0.4s",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: accent,
              boxShadow: `0 0 6px ${accent}`,
              animation: isPlaying ? "pulse 1s ease-in-out infinite" : "none",
            }}
          />
          <span className="text-xs font-semibold tracking-widest" style={{ color: accent }}>
            A/B PLAYER
          </span>
        </div>
        <span className="mono text-xs truncate max-w-48" style={{ color: "var(--text-muted)" }}>
          {filename}
        </span>
      </div>

      {/* A/B Toggle Pills */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        {(["A", "B"] as const).map((m) => {
          const active   = mode === m;
          const disabled = m === "B" && (masterUnavailable || !engine.masteredUrl);
          const mAccent  = m === "B" ? "#38bdf8" : "#8b5cf6";
          return (
            <motion.button
              key={m}
              onClick={() => engine.setMode(m)}
              disabled={disabled}
              title={m === "B" && !masteredUrl ? "Master noch nicht verfügbar" : undefined}
              whileHover={disabled ? {} : { scale: 1.04 }}
              whileTap={disabled   ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex-1 py-3 rounded-xl font-bold tracking-widest text-sm relative overflow-hidden"
              style={{
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.35 : 1,
                background: active
                  ? `linear-gradient(135deg, ${mAccent}22, ${mAccent}11)`
                  : "rgba(255,255,255,0.02)",
                border: `1.5px solid ${active ? mAccent : "rgba(255,255,255,0.06)"}`,
                color: active ? mAccent : "var(--text-muted)",
                boxShadow: active ? `0 0 20px ${mAccent}33, inset 0 1px 0 ${mAccent}22` : "none",
                transition: "all 0.3s ease",
              }}
            >
              {/* Animated glow sweep */}
              {active && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
                  style={{
                    background: `linear-gradient(90deg, transparent, ${mAccent}18, transparent)`,
                  }}
                />
              )}
              <span className="relative z-10">
                {m} · {m === "A" ? "ORIGINAL" : "MASTER"}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Waveform + Oscilloscope canvas area — clickable to seek */}
      <div
        ref={waveAreaRef}
        className="relative mx-5 mb-3 rounded-xl overflow-hidden"
        style={{ height: 80, cursor: "pointer" }}
        onClick={(e) => handleScrub(e, waveAreaRef)}
        onMouseDown={() => { isDragging.current = true; }}
      >
        {/* Static decoded waveform */}
        <canvas
          ref={waveCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />
        {/* Live oscilloscope overlay */}
        <canvas
          ref={liveCanvasRef}
          className="absolute inset-0 w-full h-full"
          width={800}
          height={80}
        />
        {/* Gradient edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, rgba(8,10,18,0.6) 0%, transparent 8%, transparent 92%, rgba(8,10,18,0.6) 100%)`,
          }}
        />
        {/* No audio yet overlay */}
        {!engine.staticWaveform && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Loading waveform…
            </span>
          </div>
        )}
      </div>

      {/* Live spectrum strip */}
      <div className="mx-5 mb-3 rounded-lg overflow-hidden" style={{ height: 28 }}>
        <canvas
          ref={spectrumCanvasRef}
          className="w-full h-full"
          width={512}
          height={28}
        />
      </div>

      {/* Scrubber */}
      <div className="px-5 mb-3">
        <div
          ref={scrubberRef}
          className="h-1 rounded-full cursor-pointer relative group"
          style={{ background: "rgba(255,255,255,0.06)" }}
          onClick={handleScrub}
          onMouseDown={() => { isDragging.current = true; }}
        >
          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-none"
            style={{
              width: `${progress}%`,
              background: isB
                ? "linear-gradient(90deg, #8b5cf6, #38bdf8)"
                : "linear-gradient(90deg, #4a3fc7, #8b5cf6)",
            }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `${progress}%`,
              transform: "translate(-50%, -50%)",
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 px-5 pb-4">

        {/* VU Left */}
        <canvas
          ref={vuLRef}
          width={6}
          height={40}
          className="rounded-sm flex-shrink-0"
        />

        {/* Play/Pause */}
        <motion.button
          onClick={engine.togglePlay}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="relative flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0"
          style={{
            background: isPlaying
              ? `radial-gradient(circle, ${accent}33, ${accent}11)`
              : "rgba(255,255,255,0.05)",
            border: `1.5px solid ${isPlaying ? accent : "rgba(255,255,255,0.1)"}`,
            boxShadow: isPlaying ? `0 0 20px ${accent}44` : "none",
          }}
        >
          {/* Pulsing ring when playing */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.6, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ border: `1px solid ${accent}` }}
              />
            )}
          </AnimatePresence>

          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="5"  y="3" width="5" height="18" rx="1.5" fill={accent} />
              <rect x="14" y="3" width="5" height="18" rx="1.5" fill={accent} />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M6 3l15 9-15 9V3z" fill={accent} />
            </svg>
          )}
        </motion.button>

        {/* VU Right */}
        <canvas
          ref={vuRRef}
          width={6}
          height={40}
          className="rounded-sm flex-shrink-0"
        />

        {/* Time */}
        <span className="mono text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
          {formatTime(currentTime)}
          <span style={{ color: "rgba(255,255,255,0.2)" }}> / </span>
          {formatTime(duration)}
        </span>

        {/* Mode label */}
        <div className="ml-auto flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.span
              key={mode}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-semibold tracking-wider"
              style={{ color: accent }}
            >
              {isB ? "MASTERED" : "ORIGINAL"}
            </motion.span>
          </AnimatePresence>

          {masterUnavailable && (
            <span className="text-xs px-2 py-0.5 rounded" style={{
              background: "rgba(255,71,87,0.1)",
              color: "var(--accent-red)",
              border: "1px solid rgba(255,71,87,0.2)",
              fontSize: "10px",
            }}>
              master unavailable
            </span>
          )}
        </div>

        {/* Keyboard hints */}
        <div className="flex gap-2 ml-2">
          {[["Space", "▶"], ["A", "A"], ["B", "B"]].map(([k, label]) => (
            <kbd
              key={k}
              className="text-xs px-1.5 py-0.5 rounded mono"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.25)",
                fontSize: "10px",
              }}
            >
              {label}
            </kbd>
          ))}
        </div>
      </div>
    </div>
  );
}
