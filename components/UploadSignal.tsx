import { useId } from "react";
/** Decorative file receipt; the ring only represents actual upload bytes. */
export default function UploadSignal({ phase = "idle", dragging = false, progress = 0 }: { phase?: "idle" | "uploading" | "received"; dragging?: boolean; progress?: number }) {
  const id = useId();
  const amount = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
  return <div className="studio-upload-signal" data-phase={phase} data-dragging={dragging} aria-hidden="true">
    <svg viewBox="0 0 240 100" fill="none">
      <defs><linearGradient id={id} x1="30" y1="20" x2="210" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#9a80ef" /><stop offset="1" stopColor="#7ed9e9" /></linearGradient></defs>
      <ellipse cx="120" cy="52" rx="92" ry="27" stroke={`url(#${id})`} opacity=".18" />
      <ellipse className="studio-upload-orbit" cx="120" cy="52" rx="77" ry="36" stroke={`url(#${id})`} opacity=".3" />
      <circle cx="120" cy="50" r="30" fill="#111a2a" stroke={`url(#${id})`} strokeOpacity=".4" />
      {phase === "uploading" && <circle className="studio-upload-ring" cx="120" cy="50" r="30" stroke="#8cd9e9" strokeWidth="2" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - amount} />}
      {phase === "received" ? <path className="studio-upload-check" d="m109 50 8 8 16-17" stroke="#a0e4d6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" /> : <g className="studio-upload-arrow" stroke={`url(#${id})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M120 61V39m-8 9 8-9 8 9M109 64h22" /></g>}
      <circle cx="39" cy="41" r="2" fill="#9a80ef" /><circle cx="201" cy="63" r="2" fill="#7ed9e9" />
    </svg>
  </div>;
}
