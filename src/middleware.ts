import { NextResponse } from "next/server";

// Middleware pass-through to ensure NextAuth session resolution is handled cleanly 
// by Server Components directly without Vercel HTTPS cookie redirect loops.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: []
};
