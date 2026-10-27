"use client";
import { useId, useRef } from "react";
import MasteringSonicCore from "@/components/MasteringSonicCore";
/** A decorative sound sculpture, not a waveform, meter or quality score. */
export default function MasterSignatureArtwork() {
  const gradient = useId(), completed = useRef(false);
  return <div className="master-signature-art" aria-hidden="true">
    <div className="master-signature-aura" />
    <MasteringSonicCore step="complete" completed={completed} />
    <svg viewBox="0 0 400 260" fill="none" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id={gradient} x1="60" y1="50" x2="345" y2="215" gradientUnits="userSpaceOnUse"><stop stopColor="rgb(var(--bz-paint-9ecdf6))" /><stop offset=".5" stopColor="rgb(var(--bz-paint-c3a5ff))" /><stop offset="1" stopColor="rgb(var(--bz-paint-84e0e0))" /></linearGradient></defs>
      <ellipse cx="200" cy="126" rx="143" ry="88" stroke={`url(#${gradient})`} strokeOpacity=".16" transform="rotate(-19 200 126)" />
      <path d="M59 173h43m196-91h43M91 56v10m218 130v10" stroke={`url(#${gradient})`} strokeOpacity=".5" />
      <circle cx="59" cy="173" r="2.5" fill="rgb(var(--bz-paint-9dc9f2))" /><circle cx="341" cy="82" r="2.5" fill="rgb(var(--bz-paint-c0a2ef))" />
      <path d="M121 222c40 9 118 9 158 0" stroke={`url(#${gradient})`} strokeOpacity=".6" />
    </svg>
    <span className="master-signature-caption">SONIC / SIGNATURE</span>
  </div>;
}
