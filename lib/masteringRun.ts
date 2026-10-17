/** A workspace owns the request, not its animated/unmounting start button. */
export class MasteringRun {
  private active: AbortController | null = null;

  start() {
    if (this.active) return null;
    const controller = new AbortController();
    this.active = controller;
    return {
      signal: controller.signal,
      current: () => this.active === controller && !controller.signal.aborted,
      finish: () => { if (this.active === controller) this.active = null; },
    };
  }

  reset() {
    this.active?.abort();
    this.active = null;
  }
}
