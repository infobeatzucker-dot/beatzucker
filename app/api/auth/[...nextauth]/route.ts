import NextAuth, { type NextAuthOptions } from "next-auth";
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
        email:    { label: "E-Mail",   type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Account lockout: max 5 attempts per 15 minutes
        if (!rateLimit(`login:${email}`, 5, 15 * 60 * 1000)) {
          throw new Error("Zu viele Login-Versuche. Bitte warte 15 Minuten.");
        }

        const user = await db.user.findUnique({
          where: { email },
        });
        if (!user?.password) return null;

        const valid = await verifyPassword(credentials.password, user.password);
        if (!valid) return null;

        // 2FA check — if enabled, OTP must be present and valid
        if (user.twoFactorEnabled) {
          const otp = (credentials as Record<string, string>).otp;
          if (!otp) return null;
          if (
            user.loginOtp !== otp ||
            !user.loginOtpExpires ||
            user.loginOtpExpires < new Date()
          ) return null;
          // Clear OTP after successful use
          await db.user.update({
            where: { id: user.id },
            data:  { loginOtp: null, loginOtpExpires: null },
          });
        }

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,     // 30 Tage Token-Lebensdauer
    updateAge: 60 * 60,             // Token wird jede Stunde erneuert (statt alle 24h)
  },

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Store password-change timestamp at login time
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { passwordChangedAt: true },
        });
        token.pwChangedAt = dbUser?.passwordChangedAt?.getTime() ?? 0;
      }

      // Every 15 min, verify password hasn't changed since login
      const lastCheck = (token.lastPwCheck as number) || 0;
      if (token.id && Date.now() - lastCheck > 15 * 60 * 1000) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true },
        });
        const currentPwChanged = dbUser?.passwordChangedAt?.getTime() ?? 0;
        if (currentPwChanged > ((token.pwChangedAt as number) || 0)) {
          // Password was changed — invalidate session
          return {} as typeof token;
        }
        token.lastPwCheck = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Send welcome email for OAuth signups (Google etc.)
      if (user.email) {
        sendWelcomeEmail(user.email).catch((err) => console.error("[email] welcome:", err));
      }
    },
  },

  pages: {
    signIn: "/",     // Modal on main page — never redirect to /auth/signin
    error:  "/",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
