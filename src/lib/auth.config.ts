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
      session.user.id = String(token.id ?? "");
      session.user.email = String(token.email ?? session.user.email ?? "");
      session.user.role = (token.role as "COLONO" | "ADMIN") ?? "COLONO";
      session.user.firstName = String(token.firstName ?? "");
      session.user.lastName = String(token.lastName ?? "");
      session.user.houseNumber = (token.houseNumber as string | null) ?? null;
      session.user.accessCode = (token.accessCode as string | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
