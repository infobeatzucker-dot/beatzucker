import { db } from "@/lib/db";
import { sendNewRegistrationAdminEmail } from "@/lib/email";

export async function deliverRegistration(userId: string): Promise<void> {
  const now = new Date();
  const claimed = await db.registrationNotification.updateMany({
    where: { userId, sentAt: null, nextAttemptAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { lockedUntil: new Date(now.getTime() + 5 * 60_000), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return;
  try {
    // Fetch only the metadata actually needed for the notification.
    const notification = await db.registrationNotification.findUnique({ where: { userId },
      include: { user: { select: { email: true, name: true, createdAt: true } } },
    });
    if (!notification) return; // Account erased while queued; cascade removes work.
    await sendNewRegistrationAdminEmail({ userId, ...notification.user, provider: notification.provider });
    await db.registrationNotification.updateMany({ where: { userId, sentAt: null },
      data: { sentAt: new Date(), lockedUntil: null },
    });
  } catch {
    // Never log user details, provider payloads or credentials.
    console.warn("[registration-mail] Delivery pending; will retry");
    const notification = await db.registrationNotification.findUnique({ where: { userId }, select: { attempts: true } });
    if (notification) {
      const delay = Math.min(30 * 60_000, 60_000 * 2 ** Math.min(notification.attempts - 1, 5));
      await db.registrationNotification.updateMany({ where: { userId, sentAt: null },
        data: { lockedUntil: null, nextAttemptAt: new Date(Date.now() + delay) },
      });
    }
  }
}

const queueState = globalThis as typeof globalThis & { __beatzuckerRegistrationQueue?: ReturnType<typeof setInterval> };
export async function sweepRegistrationQueue() {
  // No outbound email for builds or explicitly isolated QA instances.
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.BEATZUCKER_ISOLATED_QA === "1") return;
  const now = new Date();
  await db.registrationNotification.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - 30 * 24 * 3600_000) } } });
  const pending = await db.registrationNotification.findMany({
    where: { sentAt: null, nextAttemptAt: { lte: now }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    orderBy: { nextAttemptAt: "asc" }, take: 10, select: { userId: true },
  });
  for (const notification of pending) await deliverRegistration(notification.userId);
}
export function startRegistrationQueue() {
  if (queueState.__beatzuckerRegistrationQueue || process.env.NEXT_PHASE === "phase-production-build" || process.env.BEATZUCKER_ISOLATED_QA === "1") return;
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    try { await sweepRegistrationQueue(); }
    catch { console.error("[registration-mail] Queue sweep failed; pending notifications remain stored"); }
    finally { running = false; }
  };
  void sweep();
  const timer = setInterval(() => void sweep(), 60_000);
  timer.unref?.();
  queueState.__beatzuckerRegistrationQueue = timer;
}
