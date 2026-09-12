import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.profileCompleted = Boolean(token.profileCompleted);
        session.user.username = token.username;
        session.user.phone = token.phone;
        session.user.isEmailVerified = Boolean(token.emailVerified);
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
