/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } },
  output: "standalone",
  env: {
    // Provide a build-time fallback so NextAuth's internal `new URL(NEXTAUTH_URL)`
    // doesn't crash during static page generation on Vercel. At runtime, the real
    // NEXTAUTH_URL from Vercel environment variables takes precedence.
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000"
  }
};
module.exports = nextConfig;
