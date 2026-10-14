import type { Session } from "next-auth";
import { db } from "@/lib/db";

export async function requireAdmin(session: Session | null) {
  const email = session?.user?.email;
  if (!email || !process.env.ADMIN_EMAIL || email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) return false;
  return !!await db.user.findUnique({ where: { email }, select: { id: true } });
}
