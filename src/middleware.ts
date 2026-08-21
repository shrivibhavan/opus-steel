export { default } from "next-auth/middleware";

// Every route below requires a signed-in session. Fine-grained role checks
// (e.g. "OFFICE can release a work order") happen inside each API route via
// src/lib/permissions.ts — middleware only handles "logged in or not".
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/work-orders/:path*",
    "/materials/:path*",
    "/drawings/:path*",
    "/plant/:path*",
    "/api/projects/:path*",
    "/api/work-orders/:path*",
    "/api/materials/:path*",
    "/api/drawings/:path*"
  ]
};
