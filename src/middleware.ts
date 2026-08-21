import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET || "opus-steel-production-secret-key-2026"
});

// Every route below requires a signed-in session.
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
