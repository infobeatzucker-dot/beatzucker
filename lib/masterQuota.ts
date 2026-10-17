import { DAILY_MASTER_LIMIT } from "@/lib/constants";
import type { Prisma } from "@prisma/client";
export const MAX_DAILY_MASTER_LIMIT = 1000;
export function validDailyMasterLimit(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_DAILY_MASTER_LIMIT);
}
export function dailyMasterLimit(override?: number | null) {
  return typeof override === "number" && validDailyMasterLimit(override) ? override : DAILY_MASTER_LIMIT;
}
/** Preserve the existing server-local midnight boundary across all quota views. */
export function startOfMasteringDay(now = new Date()) { const start = new Date(now); start.setHours(0, 0, 0, 0); return start; }
export async function usedDailyMasters(client: Pick<Prisma.TransactionClient, "master" | "dailyMasterCharge">, userId: string, start = startOfMasteringDay()) {
  const [charges, legacy] = await Promise.all([
    client.dailyMasterCharge.count({ where: { userId, day: { gte: start }, OR: [{ masterId: null }, { master: { status: { in: ["done", "processing"] } } }] } }),
    client.master.count({ where: { userId, status: { in: ["done", "processing"] }, createdAt: { gte: start }, dailyCharge: { is: null } } }),
  ]);
  return charges + legacy;
}
