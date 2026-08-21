import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      workOrders: { orderBy: { createdAt: "desc" } },
      drawings: { include: { revisions: true } },
      materialTx: { include: { material: true }, orderBy: { date: "desc" } }
    }
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}
