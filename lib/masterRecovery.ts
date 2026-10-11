import { db } from "@/lib/db";
import { removeMasterFiles } from "@/lib/storage";
import { activeDspMasterIds } from "@/lib/dspJobs";

// Age alone is insufficient: a disconnected executor can still be running.
// Always check the Python worker before changing status or removing exports.
const STALE_PROCESSING_MS = 15 * 60 * 1000;

export async function recoverInterruptedMasters(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS);
  const stale = await db.master.findMany({
    where: { status: "processing", createdAt: { lt: cutoff } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;
  const active = await activeDspMasterIds();
  const interrupted = stale.filter((master) => !active.has(master.id));
  let recovered = 0;

  for (const master of interrupted) {
    const result = await db.master.updateMany({
      where: { id: master.id, status: "processing", createdAt: { lt: cutoff } },
      data: { status: "error" },
    });
    if (result.count === 1) { await removeMasterFiles(master.id); recovered++; }
  }
  return recovered;
}

const recoveryState = globalThis as typeof globalThis & { __beatzuckerRecovery?: ReturnType<typeof setInterval> };

export function startMasterRecovery() {
  if (recoveryState.__beatzuckerRecovery) return;
  let running = false;
  async function sweep() {
    if (running) return;
    running = true;
    try {
      const count = await recoverInterruptedMasters();
      if (count) console.warn(`[recovery] Recovered ${count} interrupted mastering job(s)`);
    } catch (error) { console.error("[recovery] Sweep skipped:", error); }
    finally { running = false; }
  }
  void sweep();
  const timer = setInterval(() => void sweep(), 60_000);
  timer.unref?.();
  recoveryState.__beatzuckerRecovery = timer;
}
