import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    passwordVersion?: number;
    authenticatedAt?: number;
    authProvider?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    passwordVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
