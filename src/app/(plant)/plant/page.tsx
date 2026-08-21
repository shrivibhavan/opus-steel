import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";

// Only RELEASED (and further-along, still-in-progress) work orders ever
// reach this screen — DRAFT work orders are invisible to the plant.
export default async function PlantDashboardPage() {
  const workOrders = await prisma.workOrder.findMany({
    where: {
      status: {
        in: ["RELEASED", "MATERIAL_PENDING", "READY_FOR_PRODUCTION", "IN_PRODUCTION", "PARTIALLY_COMPLETED"]
      }
    },
    include: { project: true, items: true, production: true },
    orderBy: { releasedAt: "desc" }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedToday = await prisma.productionEntry.count({
    where: { productionDate: { gte: today } }
  });
  const pendingQc = await prisma.workOrder.count({ where: { status: "QC_PENDING" } });
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
          const planned = w.items.reduce((s, i) => s + Number(i.plannedQuantity), 0);
          const completed = w.production.reduce((s, p) => s + Number(p.completedQuantity), 0);
          return (
            <Link key={w.id} href={`/plant/${w.id}`} className="card block p-4 hover:border-steel-400">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{w.workOrderNumber}</p>
                <StatusBadge status={w.status} />
              </div>
              <p className="mb-3 text-sm text-steel-600">{w.project.name}</p>
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
