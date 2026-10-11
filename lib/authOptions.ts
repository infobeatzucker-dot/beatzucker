import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        if (!rateLimit(`login:${email}`, 5, 15 * 60 * 1000)) {
          throw new Error("Zu viele Login-Versuche. Bitte warte 15 Minuten.");
        }
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.password || !await verifyPassword(credentials.password, user.password)) return null;
        if (user.twoFactorEnabled) {
          const otp = (credentials as Record<string, string>).otp;
          if (!otp || user.loginOtp !== otp || !user.loginOtpExpires || user.loginOtpExpires < new Date()) return null;
          const consumed = await db.user.updateMany({
            where: { id: user.id, loginOtp: otp, loginOtpExpires: { gt: new Date() } },
            data: { loginOtp: null, loginOtpExpires: null },
          });
          if (consumed.count !== 1) return null;
        }
        return { id: user.id, email: user.email, name: user.name, image: user.image, passwordVersion: user.passwordChangedAt?.getTime() ?? 0 };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.authenticatedAt = Date.now();
        token.authProvider = account?.provider;
        token.lastPwCheck = 0;
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { passwordChangedAt: true },
        });
        // Keep the version from password verification: a concurrent reset must
        // not turn an old-password login into a newly valid session.
        token.pwChangedAt = account?.provider === "credentials"
          ? (user.passwordVersion ?? 0) : (dbUser?.passwordChangedAt?.getTime() ?? 0);
      }
      const lastCheck = (token.lastPwCheck as number) || 0;
      if (token.id && Date.now() - lastCheck > 60 * 1000) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true },
        });
        const currentPwChanged = dbUser?.passwordChangedAt?.getTime() ?? 0;
        if (!dbUser || currentPwChanged > ((token.pwChangedAt as number) || 0)) return {} as typeof token;
        token.lastPwCheck = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      session.passwordVersion = typeof token.pwChangedAt === "number" ? token.pwChangedAt : 0;
      session.authenticatedAt = typeof token.authenticatedAt === "number" ? token.authenticatedAt : undefined;
      session.authProvider = typeof token.authProvider === "string" ? token.authProvider : undefined;
      if (session.user && token.id) session.user.id = token.id as string;
      if (!token.id) session.user = { id: "", email: null, name: null, image: null };
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email) sendWelcomeEmail(user.email).catch((err) => console.error("[email] welcome:", err));
    },
  },
  pages: { signIn: "/", error: "/" },
  secret: process.env.NEXTAUTH_SECRET,
};
