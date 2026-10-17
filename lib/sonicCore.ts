/** Decorative stage illustration, independent of audio and DSP data. */
export type SonicStage = "waiting" | "analyzing" | "eq" | "compression" | "ms" | "saturation" | "limiting" | "rendering" | "complete";
export function sonicStage(step?: string): SonicStage {
  return ["waiting", "eq", "compression", "ms", "saturation", "limiting", "rendering", "complete"].includes(step || "") ? step as SonicStage : "analyzing";
}

export function drawSonicCore(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, stage: SonicStage, finish = 0) {
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;
  const cx = width * .5, cy = height * .48, radius = Math.min(width * .22, height * .35);
  const t = time * (stage === "waiting" ? .00009 : .00025), warm = stage === "saturation", calm = stage === "waiting" || stage === "rendering";
  const color = warm ? "238,160,122" : stage === "ms" ? "115,213,230" : "163,143,246";
  const halo = ctx.createRadialGradient(cx, cy, radius * .1, cx, cy, radius * 2.25);
  halo.addColorStop(0, `rgba(${color},.16)`); halo.addColorStop(.45, `rgba(${color},.065)`); halo.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(140,155,205,.05)"; ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * radius * .62, cy - radius * 1.5); ctx.lineTo(cx + i * radius * .62, cy + radius * 1.5); ctx.stroke();
  }
  for (let orbit = 0; orbit < 2; orbit++) {
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const a = i / 100 * Math.PI * 2, rot = orbit ? -.35 : .3;
      const ox = Math.cos(a) * radius * (stage === "ms" ? 1.85 : 1.6), oy = Math.sin(a) * radius * .42;
      const x = cx + ox * Math.cos(rot) - oy * Math.sin(rot), y = cy + ox * Math.sin(rot) + oy * Math.cos(rot);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = orbit ? "rgba(167,139,250,.18)" : "rgba(93,200,242,.23)"; ctx.lineWidth = .8; ctx.stroke();
  }
  // Woven rotating geometry, not a simulated FFT or loudness measurement.
  const spin = t * (calm ? .4 : .75), compression = stage === "compression" ? .85 + .035 * Math.sin(t * 3) : 1;
  for (let band = 0; band < 20; band++) {
    const latitude = (band / 19 - .5) * Math.PI * .92, ring = Math.cos(latitude), ry = Math.sin(latitude);
    ctx.beginPath();
    for (let i = 0; i <= 88; i++) {
      const a = i / 88 * Math.PI * 2;
      const ripple = stage === "eq" ? .07 * Math.sin(a * 5 + band * .55 + t * 2) : .025 * Math.sin(a * 3 + t + band * .4);
      const px = Math.cos(a + spin) * ring * (1 + ripple), pz = Math.sin(a + spin) * ring;
      let py = ry * compression + pz * Math.sin(.32);
      if (stage === "limiting") py = Math.max(-.78, Math.min(.78, py));
      const sphereX = px * radius * (1 + pz * .13), sphereY = py * radius;
      const waveX = (i / 88 - .5) * radius * 2.5, waveY = Math.sin(i / 88 * Math.PI * 7) * Math.sin(i / 88 * Math.PI) * radius * .16 + (band - 9.5) * 1.25;
      const x = cx + sphereX * (1 - finish) + waveX * finish, y = cy + sphereY * (1 - finish) + waveY * finish;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const ink = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    ink.addColorStop(0, `rgba(97,206,246,${calm ? .24 : .48})`); ink.addColorStop(.55, `rgba(${color},.57)`); ink.addColorStop(1, "rgba(233,150,222,.42)");
    ctx.strokeStyle = ink; ctx.lineWidth = band % 4 === 0 ? 1.15 : .65; ctx.stroke();
  }
  for (let i = 0; i < 28; i++) {
    const a = i * 2.39996 + t * (i % 2 ? .1 : -.12), distance = radius * (1.22 + (i % 7) * .12);
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * distance, cy + Math.sin(a) * distance * .68, i % 5 === 0 ? 1.6 : .8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${i % 3 ? color : "113,208,244"},${calm ? .23 : .48})`; ctx.fill();
  }
}
