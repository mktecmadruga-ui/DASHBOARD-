import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Public paths that DON'T require authentication.
 * Everything else (including /api/*) requires a valid Supabase session.
 */
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/",                     // login/logout endpoints
  "/api/telegram/webhook",          // Telegram calls this server-to-server
  "/api/cron/",                     // Vercel cron (auth via CRON_SECRET)
  "/api/instagram/refresh-token",   // cron-only (auth via CRON_SECRET)
];

const STATIC_PATHS = ["/_next/", "/uploads/", "/favicon.ico"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p)) ||
    STATIC_PATHS.some(p => pathname.startsWith(p) || pathname === p)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, fail closed for API routes (don't leak data)
  // and allow page routes (dev fallback).
  if (!supabaseUrl || !supabaseKey) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Auth não configurado" }, { status: 503 });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // For API routes, return 401 JSON instead of redirecting
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
