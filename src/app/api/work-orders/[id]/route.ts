import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      project: { include: { customer: true } },
      items: true,
      drawings: { include: { revisions: true } },
      materialTx: { include: { material: true }, orderBy: { date: "desc" } },
      production: { orderBy: { createdAt: "desc" }, include: { process: true } },
      qcInspections: { orderBy: { createdAt: "desc" } },
      dispatches: { orderBy: { createdAt: "desc" } },
      scrapRecords: { orderBy: { date: "desc" } }
    }
  });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Derived planned-vs-actual figures — never persisted, always computed fresh.
  const plannedQty = workOrder.items.reduce((sum, i) => sum + Number(i.plannedQuantity), 0);
  const completedQty = workOrder.production.reduce((sum, p) => sum + Number(p.completedQuantity), 0);
  const steelUsedKg = workOrder.production.reduce((sum, p) => sum + Number(p.steelUsedKg), 0);
  const scrapKg = workOrder.production.reduce((sum, p) => sum + Number(p.scrapKg), 0);
  const issuedKg = workOrder.materialTx
    .filter((t) => t.txType === "ISSUE")
    .reduce((sum, t) => sum + Number(t.weightKg ?? 0), 0);
  const returnedKg = workOrder.materialTx
    .filter((t) => t.txType === "RETURN")
    .reduce((sum, t) => sum + Number(t.weightKg ?? 0), 0);
  const netIssuedKg = issuedKg - returnedKg;

  return NextResponse.json({
    ...workOrder,
    summary: {
      plannedQty,
      completedQty,
      remainingQty: Math.max(plannedQty - completedQty, 0),
      progressPercent: plannedQty > 0 ? (completedQty / plannedQty) * 100 : 0,
      issuedKg: netIssuedKg,
      usedKg: steelUsedKg,
      scrapKg,
      remainingKg: Math.max(netIssuedKg - steelUsedKg - scrapKg, 0),
      utilizationPercent: netIssuedKg > 0 ? (steelUsedKg / netIssuedKg) * 100 : 0,
      scrapPercent: netIssuedKg > 0 ? (scrapKg / netIssuedKg) * 100 : 0
    }
  });
}
