"use client";

import { useRef, type CSSProperties } from "react";
import "./studio-console.css";

export function StudioDial({ label, reading, value, min, max, step, change, disabled, inputClassName }: {
  label: string; reading: string; value: number; min: number; max: number; step: number;
  change: (value: number) => void; disabled?: boolean; inputClassName?: string;
}) {
  const drag = useRef<{ x: number; y: number; value: number; id: number } | null>(null);
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return <div className="bz-hardware-dial">
    <span>{label}</span>
    <div className="bz-hardware-knob"
      style={{ "--dial-angle": `${-135 + 270 * ratio}deg`, "--dial-value": `${ratio * 270}deg` } as CSSProperties}
      onPointerDown={event => {
        if (disabled || event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.querySelector("input")?.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, value, id: event.pointerId };
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start || event.pointerId !== start.id) return;
        const next = start.value + (start.y - event.clientY + (event.clientX - start.x) * .5) / 145 * (max - min);
        change(Number(Math.min(max, Math.max(min, min + Math.round((next - min) / step) * step)).toFixed(4)));
      }}
      onPointerUp={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <i aria-hidden="true"/><input className={inputClassName} type="range" aria-label={label} aria-valuetext={reading}
        disabled={disabled} min={min} max={max} step={step} value={value} onChange={event => change(Number(event.target.value))}/>
    </div>
    <output>{reading}</output>
  </div>;
}

export function StudioMeter({ label, reading, fraction, active = true, reduction = false }: {
  label: string; reading: string; fraction: number; active?: boolean; reduction?: boolean;
}) {
  const level = Math.ceil(Math.min(1, Math.max(0, fraction)) * 24);
  return <div className="bz-hardware-meter" data-active={active} data-reduction={reduction}>
    <div><span>{label}</span><output>{reading}</output></div>
    <div className="bz-hardware-leds" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} data-lit={index < level}/>)}</div>
  </div>;
}
