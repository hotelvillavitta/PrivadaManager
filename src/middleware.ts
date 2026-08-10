import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  const applyNoStore = (res: NextResponse) => {
    res.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    res.headers.set("CDN-Cache-Control", "no-store");
    res.headers.set("Vercel-CDN-Cache-Control", "no-store");
    return res;
  };

  if (isAuthApi) return applyNoStore(NextResponse.next());

  if (!isLoggedIn && !isLogin) {
    const url = new URL("/login", req.nextUrl.origin);
    return applyNoStore(NextResponse.redirect(url));
  }

  if (isLoggedIn && isLogin) {
    const url = new URL("/", req.nextUrl.origin);
    return applyNoStore(NextResponse.redirect(url));
  }

  return applyNoStore(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
