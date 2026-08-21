import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertCan } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1),
  customerId: z.string().uuid(),
  customerReference: z.string().optional(),
  location: z.string().optional(),
  projectManager: z.string().optional(),
  startDate: z.string().optional(),
  targetCompletionDate: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      customer: true,
      _count: { select: { workOrders: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    assertCan(user?.role as any, "PROJECT_CREATE");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const projectNumber = await nextNumber("PRJ");

  const project = await prisma.project.create({
    data: {
      projectNumber,
      name: parsed.data.name,
      customerId: parsed.data.customerId,
      customerReference: parsed.data.customerReference,
      location: parsed.data.location,
      projectManager: parsed.data.projectManager,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      targetCompletionDate: parsed.data.targetCompletionDate
        ? new Date(parsed.data.targetCompletionDate)
        : undefined,
      description: parsed.data.description,
      notes: parsed.data.notes,
      createdById: user!.id
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user!.id,
      entityType: "Project",
      entityId: project.id,
      action: "CREATE",
      newValue: project.projectNumber
    }
  });

  return NextResponse.json(project, { status: 201 });
}
