type Options = { continuous?: boolean; maxFps?: number; reducedFps?: number; resize?: () => void };

/** One owner for RAF, visibility, resize and reduced-motion listeners. */
export function startVisibleAnimation(element: Element, draw: (time: number) => void, options: Options = {}) {
  let frame = 0, stopped = false, inView = true, dirty = true, last = -Infinity;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const continuous = options.continuous ?? true;
  function schedule() {
    if (!stopped && !frame && inView && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(time: number) {
    frame = 0;
    if (stopped || !inView || document.hidden) return;
    const fps = media.matches ? (options.reducedFps ?? 10) : (options.maxFps ?? 30);
    if (dirty || (fps > 0 && time - last >= 1000 / fps)) {
      dirty = false; last = time; draw(time);
    }
    if (continuous && fps > 0) schedule();
  }
  function invalidate() { dirty = true; schedule(); }
  function visibility() {
    if (document.hidden || !inView) { cancelAnimationFrame(frame); frame = 0; }
    else invalidate();
  }
  const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting); visibility();
  });
  intersection?.observe(element);
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => { options.resize?.(); invalidate(); });
  resize?.observe(element);
  document.addEventListener("visibilitychange", visibility);
  media.addEventListener("change", invalidate);
  window.addEventListener("beatzucker-theme-change", invalidate);
  invalidate();
  return {
    invalidate,
    stop() {
      stopped = true; cancelAnimationFrame(frame); frame = 0;
      intersection?.disconnect(); resize?.disconnect();
      document.removeEventListener("visibilitychange", visibility); media.removeEventListener("change", invalidate);
      window.removeEventListener("beatzucker-theme-change", invalidate);
    },
  };
}
