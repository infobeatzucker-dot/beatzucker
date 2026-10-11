import { db } from "@/lib/db";
import { sendWithdrawalEmails } from "@/lib/email";

export async function deliverWithdrawal(id: string): Promise<void> {
  const now = new Date();
  const claimed = await db.withdrawalReceipt.updateMany({
    where: { id, nextAttemptAt: { lte: now }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { lockedUntil: new Date(now.getTime() + 5 * 60_000), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return;
  const receipt = await db.withdrawalReceipt.findUniqueOrThrow({ where: { id } });
  try {
    // Each successful recipient is recorded separately: partial failure is retryable.
    await sendWithdrawalEmails({
      name: receipt.name, email: receipt.email, contractReference: receipt.contractReference,
      receivedAt: receipt.receivedAt, receiptId: receipt.id, lang: receipt.lang === "en" ? "en" : "de",
    }, {
      userSent: !!receipt.userEmailSentAt, adminSent: !!receipt.adminEmailSentAt,
      onSent: async recipient => {
        await db.withdrawalReceipt.update({ where: { id }, data: recipient === "user" ? { userEmailSentAt: new Date() } : { adminEmailSentAt: new Date() } });
      },
    });
  } catch {
    // Avoid logging personal form contents or email provider payloads.
    console.warn(`[withdrawal] Delivery pending for receipt ${id}`);
  } finally {
    const delay = Math.min(24 * 3600_000, 60_000 * 2 ** Math.min(receipt.attempts, 11));
    await db.withdrawalReceipt.update({ where: { id }, data: { lockedUntil: null, nextAttemptAt: new Date(Date.now() + delay) } });
  }
}

const queueState = globalThis as typeof globalThis & { __beatzuckerWithdrawalQueue?: ReturnType<typeof setInterval> };
export function startWithdrawalQueue() {
  if (queueState.__beatzuckerWithdrawalQueue) return;
  let running = false;
  async function sweep() {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      // Retention is separate from audio cleanup and respects explicitly held evidence.
      await db.withdrawalReceipt.deleteMany({ where: { legalHold: false, retainUntil: { lt: now }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] } });
      const receipts = await db.withdrawalReceipt.findMany({
        where: { nextAttemptAt: { lte: now }, OR: [{ userEmailSentAt: null }, { adminEmailSentAt: null }] },
        orderBy: { nextAttemptAt: "asc" }, take: 10, select: { id: true },
      });
      for (const receipt of receipts) await deliverWithdrawal(receipt.id);
    } catch { console.error("[withdrawal] Queue sweep failed; receipts remain stored"); }
    finally { running = false; }
  }
  void sweep();
  const timer = setInterval(() => void sweep(), 60_000);
  timer.unref?.();
  queueState.__beatzuckerWithdrawalQueue = timer;
}
