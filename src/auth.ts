import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { createUserFromProfile, findUserForLogin } from "@/lib/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Google sign-in is intentionally disabled while profile sign-up uses the form below.
    // Google({
    //   clientId: process.env.AUTH_GOOGLE_ID,
    //   clientSecret: process.env.AUTH_GOOGLE_SECRET,
    // }),
    Credentials({
      credentials: {
        fullName: { label: "Full name", type: "text" },
        username: { label: "Username", type: "text" },
        phone: { label: "Phone number", type: "tel" },
        email: { label: "Email", type: "email" },
        identifier: { label: "Username, phone, or email", type: "text" },
        password: { label: "Password", type: "password" },
        mode: { label: "Mode", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const mode = String(credentials.mode ?? "signup");
        const password = String(credentials.password ?? "");
        const user =
          mode === "login"
            ? await findUserForLogin(
                String(credentials.identifier ?? ""),
                password
              )
            : await createUserFromProfile({
                fullName: String(credentials.fullName ?? ""),
                username: String(credentials.username ?? ""),
                phone: String(credentials.phone ?? ""),
                email: String(credentials.email ?? ""),
                password,
              });

        if (!user) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          phone: user.phone,
          email: user.email,
          profileCompleted: user.profileCompleted,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      return Boolean(user.email);
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user?.id) {
        token.userId = user.id;
        token.profileCompleted = user.profileCompleted;
        token.username = user.username;
        token.phone = user.phone;
        token.emailVerified = false;
      }

      return token;
    },
  },
});
