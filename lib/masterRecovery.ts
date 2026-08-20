import { db } from "@/lib/db";
import { removeMasterFiles } from "@/lib/storage";

// The HTTP route and Python worker both time out before this threshold. Any
// older "processing" row therefore belongs to an interrupted server process,
// not to a job that can still finish normally.
const STALE_PROCESSING_MS = 15 * 60 * 1000;

export async function recoverInterruptedMasters(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS);
  const stale = await db.master.findMany({
    where: { status: "processing", createdAt: { lt: cutoff } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;

  await db.master.updateMany({
    where: { id: { in: stale.map((master) => master.id) }, status: "processing" },
    data: { status: "error" },
  });
  await Promise.all(stale.map((master) => removeMasterFiles(master.id)));
  return stale.length;
}
