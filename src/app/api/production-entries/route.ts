import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertCan } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { z } from "zod";

const entrySchema = z.object({
  workOrderId: z.string().uuid(),
  processId: z.string().uuid().optional(),
  shift: z.string().optional(),
  operator: z.string().optional(),
  machine: z.string().optional(),
  completedQuantity: z.number().min(0),
  rejectedQuantity: z.number().min(0).default(0),
  reworkQuantity: z.number().min(0).default(0),
  steelUsedKg: z.number().min(0).default(0),
  scrapKg: z.number().min(0).default(0),
  remarks: z.string().optional()
});

// Plant-floor submission. Production workers select an existing RELEASED
// work order — they never create work orders (rule #14 / #43).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    assertCan(user?.role as any, "PRODUCTION_ENTRY_CREATE");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const body = await req.json();
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: d.workOrderId },
    include: { items: true, production: true }
  });
  if (!workOrder) return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  if (workOrder.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot record production against a cancelled work order." }, { status: 400 });
  }

  const plannedQty = workOrder.items.reduce((s, i) => s + Number(i.plannedQuantity), 0);
  const alreadyCompleted = workOrder.production.reduce((s, p) => s + Number(p.completedQuantity), 0);
  if (alreadyCompleted + d.completedQuantity > plannedQty) {
    return NextResponse.json(
      {
        error: `Completed quantity would exceed planned quantity (${plannedQty}). Already recorded: ${alreadyCompleted}.`
      },
      { status: 400 }
    );
  }

  const entryNumber = await nextNumber("PE");

  const entry = await prisma.productionEntry.create({
    data: {
      entryNumber,
      workOrderId: d.workOrderId,
      projectId: workOrder.projectId,
      processId: d.processId,
      shift: d.shift,
      operator: d.operator,
      machine: d.machine,
      completedQuantity: d.completedQuantity,
      rejectedQuantity: d.rejectedQuantity,
      reworkQuantity: d.reworkQuantity,
      steelUsedKg: d.steelUsedKg,
      scrapKg: d.scrapKg,
      remarks: d.remarks,
      createdById: user!.id
    }
  });

  const newTotalCompleted = alreadyCompleted + d.completedQuantity;
  const newStatus =
    newTotalCompleted >= plannedQty ? "PRODUCTION_COMPLETED" : "PARTIALLY_COMPLETED";
  if (!["PRODUCTION_COMPLETED"].includes(workOrder.status)) {
    await prisma.workOrder.update({ where: { id: workOrder.id }, data: { status: newStatus as any } });
  }

  if (newStatus === "PRODUCTION_COMPLETED") {
    const qcUsers = await prisma.user.findMany({ where: { role: "QC", active: true } });
    if (qcUsers.length > 0) {
      await prisma.notification.createMany({
        data: qcUsers.map((u) => ({
          userId: u.id,
          title: `${workOrder.workOrderNumber} ready for inspection`,
          body: "Production completed — awaiting QC.",
          link: `/work-orders/${workOrder.id}`
        }))
      });
    }
  }

  return NextResponse.json(entry, { status: 201 });
}
