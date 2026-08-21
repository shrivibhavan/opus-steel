import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { ReleaseButton } from "./ReleaseButton";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/permissions";

export default async function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  const [workOrder, user] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        project: { include: { customer: true } },
        items: true,
        materialTx: { include: { material: true }, orderBy: { date: "desc" } },
        production: { orderBy: { createdAt: "desc" }, include: { process: true } },
        qcInspections: true,
        dispatches: true
      }
    }),
    getCurrentUser()
  ]);
  if (!workOrder) notFound();

  const plannedQty = workOrder.items.reduce((s, i) => s + Number(i.plannedQuantity), 0);
  const completedQty = workOrder.production.reduce((s, p) => s + Number(p.completedQuantity), 0);
  const progressPercent = plannedQty > 0 ? (completedQty / plannedQty) * 100 : 0;

  const issuedKg = workOrder.materialTx
    .filter((t) => t.txType === "ISSUE")
    .reduce((s, t) => s + Number(t.weightKg ?? 0), 0);
  const usedKg = workOrder.production.reduce((s, p) => s + Number(p.steelUsedKg), 0);
  const scrapKg = workOrder.production.reduce((s, p) => s + Number(p.scrapKg), 0);
  const remainingKg = Math.max(issuedKg - usedKg - scrapKg, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-eyebrow">{workOrder.project.name} · {workOrder.project.customer.name}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-steel-900">{workOrder.workOrderNumber}</h1>
            <StatusBadge status={workOrder.status} />
          </div>
          {workOrder.jobDescription && <p className="text-sm text-steel-500">{workOrder.jobDescription}</p>}
        </div>
        {workOrder.status === "DRAFT" && can(user?.role as any, "WORK_ORDER_RELEASE") && (
          <ReleaseButton workOrderId={workOrder.id} />
        )}
      </div>

      <div className="card p-5">
        <p className="label-eyebrow mb-2">Production Progress</p>
        <ProgressBar percent={progressPercent} />
        <p className="mt-1 text-xs text-steel-500">
          {completedQty} / {plannedQty} completed
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="label-eyebrow">Steel Issued</p>
          <p className="text-xl font-semibold">{issuedKg.toFixed(0)} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Steel Used</p>
          <p className="text-xl font-semibold">{usedKg.toFixed(0)} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Scrap</p>
          <p className="text-xl font-semibold">{scrapKg.toFixed(0)} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Remaining</p>
          <p className="text-xl font-semibold">{remainingKg.toFixed(0)} KG</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-steel-200 px-4 py-3">
          <p className="text-sm font-medium">Items</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Drawing #</th>
              <th className="px-4 py-3">Planned Qty</th>
            </tr>
          </thead>
          <tbody>
            {workOrder.items.map((it) => (
              <tr key={it.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3">{it.description}</td>
                <td className="px-4 py-3">{it.drawingNumber ?? "—"}</td>
                <td className="px-4 py-3">{Number(it.plannedQuantity)} {it.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-steel-200 px-4 py-3">
          <p className="text-sm font-medium">Production Entries</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Entry #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Steel Used</th>
              <th className="px-4 py-3">Scrap</th>
            </tr>
          </thead>
          <tbody>
            {workOrder.production.map((p) => (
              <tr key={p.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 font-medium">{p.entryNumber}</td>
                <td className="px-4 py-3">{p.productionDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-3">{Number(p.completedQuantity)}</td>
                <td className="px-4 py-3">{Number(p.steelUsedKg)} KG</td>
                <td className="px-4 py-3">{Number(p.scrapKg)} KG</td>
              </tr>
            ))}
            {workOrder.production.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-steel-400">
                  No production recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
