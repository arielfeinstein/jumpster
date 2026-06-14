import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Runs before every matched request. Redirects unauthenticated users to /login
 * and bounces already-signed-in users away from auth pages back to /.
 * Also forwards any refreshed session cookies so the browser stays in sync.
 */
export async function middleware(request: NextRequest) {
  // We build a response object up front so the cookie helper below can attach
  // refreshed session cookies to it. The Supabase client may silently refresh
  // an expiring token during getUser(), and those new cookies must be forwarded
  // to the browser — otherwise the session appears to expire on the next request.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request (so the server sees them) and onto
          // the response (so the browser stores the refreshed values).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with Supabase on every request.
  // Never use getSession() here — it trusts the cookie without re-validating.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, and the
    // register API route (which must be reachable without a session).
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)$).*)",
  ],
};
