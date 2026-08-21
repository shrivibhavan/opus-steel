import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const customers = await prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return NextResponse.json(customers);
}
