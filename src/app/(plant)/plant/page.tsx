import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function PlantDashboardPage() {
  let workOrders: any[] = [];
  let completedToday = 0;
  let pendingQc = 0;

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

    workOrders = dbWO || [];
    completedToday = dbToday;
    pendingQc = dbQC;
  } catch (err) {
    console.error("PlantDashboardPage query error:", err);
  }

  const materialPending = workOrders.filter((w) => w.status === "MATERIAL_PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Plant Floor Operations</h1>
        <p className="text-sm font-medium text-steel-500">Released work orders in the plant queue ready for fabrication.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4 border-t-2 border-t-blue-600">
          <p className="label-eyebrow">Active Work Orders</p>
          <p className="text-xl font-bold tabular-nums">{workOrders.length}</p>
        </div>
        <div className="card p-4 border-t-2 border-t-emerald-600">
          <p className="label-eyebrow">Production Entries Today</p>
          <p className="text-xl font-bold tabular-nums text-emerald-700">{completedToday}</p>
        </div>
        <div className="card p-4 border-t-2 border-t-amber-500">
          <p className="label-eyebrow">Pending QC</p>
          <p className="text-xl font-bold tabular-nums text-amber-700">{pendingQc}</p>
        </div>
        <div className="card p-4 border-t-2 border-t-rose-600">
          <p className="label-eyebrow">Material Pending</p>
          <p className="text-xl font-bold tabular-nums text-rose-700">{materialPending}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workOrders.map((w) => {
          const planned = (w.items || []).reduce((s: number, i: any) => s + Number(i.plannedQuantity ?? 0), 0);
          const completed = (w.production || []).reduce((s: number, p: any) => s + Number(p.completedQuantity ?? 0), 0);
          return (
            <Link key={w.id} href={`/plant/${w.id}`} className="card-hover block p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-xs font-bold text-slate-900">{w.workOrderNumber}</p>
                <StatusBadge status={w.status} />
              </div>
              <p className="mb-3 text-xs font-semibold text-slate-700">{w.project?.name || "N/A"}</p>
              <ProgressBar percent={planned > 0 ? (completed / planned) * 100 : 0} />
            </Link>
          );
        })}
        {workOrders.length === 0 && (
          <div className="col-span-full card p-12 text-center text-steel-400">
            No work orders released to the plant floor queue yet.
          </div>
        )}
      </div>
    </div>
  );
}
