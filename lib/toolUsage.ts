import { db } from "@/lib/db";

export const USAGE_TOOLS = ["mix-check", "streaming-preview", "kick-bass-conflict", "key-bpm", "silence-normalizer", "reference-comparison", "stereo-phase", "album-consistency", "audio-converter", "vocal-chain"] as const;
export const USAGE_OUTCOMES = ["started", "completed", "partial", "error", "cancelled"] as const;
export function usageDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function usageCutoff(days: number, now = new Date()) {
  const date = new Date(usageDay(now) + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}
export function validUsage(body: Record<string, unknown>) {
  return typeof body.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)
    && USAGE_TOOLS.includes(body.tool as typeof USAGE_TOOLS[number])
    && USAGE_OUTCOMES.includes(body.outcome as typeof USAGE_OUTCOMES[number]);
}
let lastCleanup = 0;
export async function cleanupToolUsage() {
  if (Date.now() - lastCleanup < 3600000) return;
  await db.toolUsage.deleteMany({ where: { day: { lt: usageCutoff(90) } } });
  lastCleanup = Date.now();
}
/** One random ID per operation, no account, filename, measurements or IP stored. */
export async function recordToolUsage(id: string, tool: string, outcome: string) {
  await cleanupToolUsage();
  if (outcome === "started") {
    await db.toolUsage.upsert({ where: { id }, create: { id, tool, day: usageDay(), outcome }, update: {} });
  } else {
    // Retries cannot double-count; only the first terminal outcome wins.
    await db.toolUsage.updateMany({ where: { id, tool, outcome: "started" }, data: { outcome } });
  }
}
