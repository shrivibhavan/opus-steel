import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const hasSecret = !!process.env.NEXTAUTH_SECRET;

  if (!dbUrl) {
    return NextResponse.json({
      status: "ERROR",
      message: "DATABASE_URL environment variable is MISSING on Vercel!",
      nextAuthUrl,
      hasSecret
    }, { status: 500 });
  }

  try {
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, active: true }
    });

    return NextResponse.json({
      status: "SUCCESS",
      message: "Connected to Neon PostgreSQL successfully!",
      userCount,
      users,
      nextAuthUrl,
      hasSecret,
      dbHost: dbUrl.split("@")[1]?.split("/")[0] || "hidden"
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "ERROR",
      message: err.message || "Failed to query Neon PostgreSQL",
      errorDetails: String(err),
      nextAuthUrl,
      hasSecret
    }, { status: 500 });
  }
}
