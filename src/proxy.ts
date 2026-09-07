import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeRequest } from "@/lib/routing";

/**
 * Owner surfaces need a Clerk session; unauthenticated visitors are sent to
 * sign-in and returned to the same URL afterwards (a legacy ?key= link
 * survives the round trip, so claiming an old tenant just works). The counter
 * is deliberately absent: the tablet authenticates with its key instead.
 */
const needsAccount = createRouteMatcher([
  "/start",
  "/dashboard(.*)",
  "/api/onboard",
  "/api/export(.*)",
  "/api/upload-photo",
]);

export default clerkMiddleware(async (auth, req) => {
  if (needsAccount(req)) await auth.protect();
  return routeRequest(req);
});

export const config = {
  matcher: [
    // Everything except static assets — Clerk must see every page that calls auth().
    "/((?!_next/|api/|favicon.ico|manifest|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)",
    // Only the owner-gated API routes; diner/cron routes stay out of the proxy.
    "/api/onboard",
    "/api/export/:path*",
    "/api/upload-photo",
  ],
};
