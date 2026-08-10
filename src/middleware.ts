import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (isAuthApi) return NextResponse.next();

  if (!isLoggedIn && !isLogin) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLogin) {
    const url = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
