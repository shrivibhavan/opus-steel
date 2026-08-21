import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertCan } from "@/lib/permissions";
import { z } from "zod";

const txSchema = z.object({
  materialId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  workOrderId: z.string().uuid().optional(),
  txType: z.enum(["RECEIPT", "ISSUE", "RETURN", "ADJUSTMENT", "SCRAP"]),
  quantity: z.number(),
  unit: z.string(),
  weightKg: z.number().optional(),
  heatNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  storeLocation: z.string().optional(),
  remarks: z.string().optional()
});

// Records RECEIPT / ISSUE / RETURN / ADJUSTMENT / SCRAP movements.
// Deletion is never allowed (rule #34) — corrections happen via a
// reversing entry, which callers create by posting an opposite txType.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    assertCan(user?.role as any, "MATERIAL_ISSUE");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const body = await req.json();
  const parsed = txSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  if (d.txType === "ISSUE") {
    const txs = await prisma.materialTransaction.findMany({ where: { materialId: d.materialId } });
    const stockKg = txs.reduce((sum, t) => {
      const w = Number(t.weightKg ?? 0);
      if (t.txType === "RECEIPT" || t.txType === "RETURN") return sum + w;
      if (t.txType === "ISSUE" || t.txType === "SCRAP") return sum - w;
      return sum;
    }, 0);
    if ((d.weightKg ?? 0) > stockKg) {
      return NextResponse.json(
        { error: `Cannot issue ${d.weightKg} KG — only ${stockKg.toFixed(2)} KG in stock.` },
        { status: 400 }
      );
    }
  }

  const tx = await prisma.materialTransaction.create({
    data: { ...d, performedById: user!.id }
  });

  if (d.txType === "ISSUE" && d.workOrderId) {
    const wo = await prisma.workOrder.findUnique({ where: { id: d.workOrderId } });
    if (wo && ["RELEASED", "MATERIAL_PENDING"].includes(wo.status)) {
      await prisma.workOrder.update({
        where: { id: d.workOrderId },
        data: { status: "READY_FOR_PRODUCTION" }
      });
    }
  }

  return NextResponse.json(tx, { status: 201 });
}
