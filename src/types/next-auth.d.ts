import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string;
      phone?: string;
      profileCompleted: boolean;
      isEmailVerified: boolean;
    };
  }

  interface User {
    username?: string;
    phone?: string;
    profileCompleted: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    profileCompleted?: boolean;
    username?: string;
    phone?: string;
    emailVerified?: boolean;
  }
}
