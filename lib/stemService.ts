import { createHmac } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { db } from "./db";

export async function stemUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, vocalRemoverEnabled: true, stemSeparationEnabled: true, passwordChangedAt: true } });
  if (!user || (session.passwordVersion ?? 0) !== (user.passwordChangedAt?.getTime() ?? 0)) return null;
  return user;
}
export function stemConfigured() {
  return process.env.STEM_TOOLS_ENABLED === "true" && !!process.env.STEM_WORKER_URL && (process.env.STEM_WORKER_SECRET?.length ?? 0) >= 32;
}
export function stemAllowed(user: NonNullable<Awaited<ReturnType<typeof stemUser>>>, tool: string) {
  return tool === "vocal-remover" ? user.vocalRemoverEnabled : tool === "stem-separation" && user.stemSeparationEnabled;
}
export async function stemFetch(userId: string, path: string, init: RequestInit = {}) {
  if (!stemConfigured()) throw Error("Stem worker disabled");
  const secret = process.env.STEM_WORKER_SECRET!;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${secret}`);
  headers.set("X-Owner", createHmac("sha256", secret).update(userId).digest("hex"));
  return fetch(`${process.env.STEM_WORKER_URL!.replace(/\/$/, "")}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(120_000) });
}
