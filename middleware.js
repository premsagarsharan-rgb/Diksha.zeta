;// middleware.js
// ✅ MODIFIED — API + page tracking headers added

import { NextResponse } from "next/server";

function isSessionCookieStructurallyValid(cookieValue) {
  if (!cookieValue) return false;
  try {
    const data = JSON.parse(cookieValue);
    if (data.userId && data.sessionToken) return true;
    return false;
  } catch {
    return false;
  }
}

function clearCookieAndRedirectToLogin(req) {
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get("session")?.value || null;

  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";
  const isApi = pathname.startsWith("/api");

  // ═══════ API RATE TRACKING HEADER ═══════
  if (isApi && sessionCookie) {
    const res = NextResponse.next();
    res.headers.set("x-request-time", new Date().toISOString());
    res.headers.set("x-request-path", pathname);
    return res;
  }

  // === DASHBOARD ===
  if (isDashboard) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (!isSessionCookieStructurallyValid(sessionCookie)) {
      return clearCookieAndRedirectToLogin(req);
    }

    // ✅ Add tracking headers for dashboard pages
    const res = NextResponse.next();
    res.headers.set("x-page-visit", pathname);
    res.headers.set("x-visit-time", new Date().toISOString());
    return res;
  }

  // === LOGIN — KABHI REDIRECT MAT KARO ===
  if (isLogin) {
    return NextResponse.next();
  }

  // === ROOT "/" ===
  if (pathname === "/") {
    if (sessionCookie && isSessionCookieStructurallyValid(sessionCookie)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (sessionCookie) {
      return clearCookieAndRedirectToLogin(req);
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/", "/api/:path*"],
};
