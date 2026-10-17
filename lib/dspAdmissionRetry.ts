/** Retry ONLY an explicit admission rejection, never an accepted/ambiguous job. */
export async function withDspAdmissionRetry(
  request: () => Promise<Response>, signal: AbortSignal, onWaiting?: () => void,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    const response = await request();
    const retry = response.headers.get("retry-after");
    if (response.status !== 503 || retry === null || attempt >= 2) return response;
    await response.body?.cancel();
    onWaiting?.();
    const seconds = Number(retry);
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); },
        Math.min(15, Math.max(1, Number.isFinite(seconds) ? seconds : 15)) * 1000);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}
