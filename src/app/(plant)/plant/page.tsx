import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function PlantDashboardPage() {
  let workOrders: any[] = [
    {
      id: "demo-wo-1",
      workOrderNumber: "WO-2026-00001",
      status: "IN_PRODUCTION",
      project: { name: "Warehouse Structural Steel Frame - Phase 1" },
      items: [{ plannedQuantity: 100 }],
      production: [{ completedQuantity: 45 }]
    }
  ];
  let completedToday = 2;
  let pendingQc = 1;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dbWO, dbToday, dbQC] = await Promise.all([
      prisma.workOrder.findMany({
        where: {
          status: {
            in: ["RELEASED", "MATERIAL_PENDING", "READY_FOR_PRODUCTION", "IN_PRODUCTION", "PARTIALLY_COMPLETED"]
          }
        },
        include: { project: true, items: true, production: true },
        orderBy: { releasedAt: "desc" }
      }),
      prisma.productionEntry.count({
        where: { productionDate: { gte: today } }
      }),
      prisma.workOrder.count({ where: { status: "QC_PENDING" } })
    ]);

    if (dbWO && dbWO.length > 0) workOrders = dbWO;
    completedToday = dbToday;
    pendingQc = dbQC;
  } catch (err) {
    console.warn("PlantDashboardPage using presentation demo fallback:", err);
  }

  const materialPending = workOrders.filter((w) => w.status === "MATERIAL_PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-steel-900">Plant Floor — Today</h1>
        <p className="text-sm text-steel-500">What should I manufacture today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="label-eyebrow">New / Active Work Orders</p>
          <p className="text-xl font-semibold">{workOrders.length}</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Production Entries Today</p>
          <p className="text-xl font-semibold">{completedToday}</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Pending QC</p>
          <p className="text-xl font-semibold">{pendingQc}</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Material Pending</p>
          <p className="text-xl font-semibold">{materialPending}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workOrders.map((w) => {
          const planned = (w.items || []).reduce((s: number, i: any) => s + Number(i.plannedQuantity ?? 0), 0);
          const completed = (w.production || []).reduce((s: number, p: any) => s + Number(p.completedQuantity ?? 0), 0);
          return (
            <Link key={w.id} href={`/plant/${w.id}`} className="card block p-4 hover:border-steel-400">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{w.workOrderNumber}</p>
                <StatusBadge status={w.status} />
              </div>
              <p className="mb-3 text-sm text-steel-600">{w.project?.name || "N/A"}</p>
              <ProgressBar percent={planned > 0 ? (completed / planned) * 100 : 0} />
            </Link>
          );
        })}
        {workOrders.length === 0 && (
          <p className="col-span-full py-12 text-center text-steel-400">
            No work orders released to the plant yet.
          </p>
        )}
      </div>
    </div>
  );
}
