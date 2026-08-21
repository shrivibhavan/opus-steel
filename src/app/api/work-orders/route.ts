import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertCan } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const itemSchema = z.object({
  itemCode: z.string().optional(),
  description: z.string().min(1),
  drawingNumber: z.string().optional(),
  drawingRevision: z.string().optional(),
  plannedQuantity: z.number().positive(),
  unit: z.string().default("Nos"),
  plannedWeightKg: z.number().optional(),
  remarks: z.string().optional()
});

const createWorkOrderSchema = z.object({
  projectId: z.string().uuid(),
  customerId: z.string().uuid(),
  salesOrderNumber: z.string().optional(),
  customerPoNumber: z.string().optional(),
  requiredDeliveryDate: z.string().optional(),
  jobDescription: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  remarks: z.string().optional(),
  items: z.array(itemSchema).min(1)
});

// Only RELEASED work orders should be visible in the plant's active queue —
// this is enforced by filtering on status here, not by a separate table.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope"); // "plant" | null

  const where: Prisma.WorkOrderWhereInput =
    scope === "plant"
      ? {
          status: {
            in: [
              "RELEASED",
              "MATERIAL_PENDING",
              "READY_FOR_PRODUCTION",
              "IN_PRODUCTION",
              "PARTIALLY_COMPLETED"
            ]
          }
        }
      : {};

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      project: true,
      items: true,
      _count: { select: { production: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(workOrders);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    assertCan(user?.role as any, "WORK_ORDER_CREATE");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const body = await req.json();
  const parsed = createWorkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const workOrderNumber = await nextNumber("WO");

  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderNumber,
      projectId: d.projectId,
      customerId: d.customerId,
      salesOrderNumber: d.salesOrderNumber,
      customerPoNumber: d.customerPoNumber,
      requiredDeliveryDate: d.requiredDeliveryDate ? new Date(d.requiredDeliveryDate) : undefined,
      jobDescription: d.jobDescription,
      priority: d.priority,
      remarks: d.remarks,
      status: "DRAFT",
      createdById: user!.id,
      items: {
        create: d.items.map((it) => ({
          itemCode: it.itemCode,
          description: it.description,
          drawingNumber: it.drawingNumber,
          drawingRevision: it.drawingRevision,
          plannedQuantity: it.plannedQuantity,
          unit: it.unit,
          plannedWeightKg: it.plannedWeightKg,
          remarks: it.remarks
        }))
      }
    },
    include: { items: true }
  });

  await prisma.auditLog.create({
    data: {
      userId: user!.id,
      entityType: "WorkOrder",
      entityId: workOrder.id,
      workOrderId: workOrder.id,
      action: "CREATE",
      newValue: `${workOrder.workOrderNumber} (DRAFT)`
    }
  });

  return NextResponse.json(workOrder, { status: 201 });
}
