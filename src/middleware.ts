import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hides the admin console behind a secret, hard-to-guess path.
 *
 * The console component physically lives at the internal route `/admin`, but that
 * path is made to 404 for direct requests — so guessing `/admin` gets nothing.
 * The console is reachable ONLY at `/<ADMIN_PANEL_SLUG>`, which this middleware
 * transparently rewrites to `/admin`.
 *
 * `ADMIN_PANEL_SLUG` is a SERVER env var (not `NEXT_PUBLIC_*`), so the real path
 * never ships in the client bundle — set it per-deployment in `.env` on the
 * server. The default below is only a fallback for local dev; override it.
 */
const SLUG = (process.env.ADMIN_PANEL_SLUG || "dl-ops-92f4c1a7").replace(/^\/+/, "");

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Secret path → serve the internal admin console (URL in the browser stays secret).
  if (pathname === `/${SLUG}` || pathname === `/${SLUG}/`) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.rewrite(url);
  }

  // The guessable /admin path is hidden: pretend it doesn't exist.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  // Run on page routes only — never on the API proxy, sockets, Next internals, or
  // static assets (so the /api/admin backend calls and everything else are untouched).
  matcher: ["/((?!api|socket.io|_next/static|_next/image|favicon.ico).*)"],
};
