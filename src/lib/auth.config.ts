import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLogin = request.nextUrl.pathname.startsWith("/login");
      const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");
      if (isAuthApi) return true;
      if (isLogin) return true;
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.houseNumber = user.houseNumber;
        token.accessCode = user.accessCode;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String(token.id ?? ""),
        email: String(token.email ?? ""),
        role: (token.role as "COLONO" | "ADMIN") ?? "COLONO",
        firstName: String(token.firstName ?? ""),
        lastName: String(token.lastName ?? ""),
        houseNumber: (token.houseNumber as string | null) ?? null,
        accessCode: (token.accessCode as string | null) ?? null,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
