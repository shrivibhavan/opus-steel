import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="label-eyebrow">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-steel-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-steel-500">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const [
    activeProjects,
    workOrders,
    productionThisMonth,
    scrapThisMonth,
    pendingQc,
    pendingDispatch
  ] = await Promise.all([
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.workOrder.findMany({ select: { status: true, requiredDeliveryDate: true } }),
    prisma.productionEntry.findMany({
      where: { productionDate: { gte: new Date(new Date().setDate(1)) } },
      select: { completedQuantity: true, steelUsedKg: true, scrapKg: true }
    }),
    prisma.scrapRecord.findMany({
      where: { date: { gte: new Date(new Date().setDate(1)) } },
      select: { weightKg: true }
    }),
    prisma.workOrder.count({ where: { status: "QC_PENDING" } }),
    prisma.workOrder.count({ where: { status: "READY_FOR_DISPATCH" } })
  ]);

  const now = new Date();
  const awaitingProduction = workOrders.filter((w) =>
    ["RELEASED", "MATERIAL_PENDING", "READY_FOR_PRODUCTION"].includes(w.status)
  ).length;
  const inProduction = workOrders.filter((w) =>
    ["IN_PRODUCTION", "PARTIALLY_COMPLETED"].includes(w.status)
  ).length;
  const completed = workOrders.filter((w) => w.status === "COMPLETED").length;
  const delayed = workOrders.filter(
    (w) => w.requiredDeliveryDate && w.requiredDeliveryDate < now && w.status !== "COMPLETED"
  ).length;

  const steelUsedMonth = productionThisMonth.reduce((s, p) => s + Number(p.steelUsedKg), 0);
  const scrapMonth =
    productionThisMonth.reduce((s, p) => s + Number(p.scrapKg), 0) +
    scrapThisMonth.reduce((s, r) => s + Number(r.weightKg), 0);
  const productionQtyMonth = productionThisMonth.reduce((s, p) => s + Number(p.completedQuantity), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-steel-900">Management Dashboard</h1>
        <p className="text-sm text-steel-500">Live snapshot across all active projects and work orders.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Active Projects" value={activeProjects} />
        <Card label="Awaiting Production" value={awaitingProduction} />
        <Card label="In Production" value={inProduction} />
        <Card label="Completed Work Orders" value={completed} />
        <Card label="Delayed Work Orders" value={delayed} sub={delayed > 0 ? "Past required delivery date" : undefined} />
        <Card label="Pending QC" value={pendingQc} />
        <Card label="Pending Dispatch" value={pendingDispatch} />
        <Card label="Steel Used This Month" value={`${steelUsedMonth.toFixed(0)} KG`} />
        <Card label="Scrap This Month" value={`${scrapMonth.toFixed(0)} KG`} />
        <Card label="Production Qty This Month" value={productionQtyMonth.toFixed(0)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <a href="/work-orders" className="card block p-5 hover:border-steel-400">
          <p className="text-sm font-medium">Review work orders →</p>
          <p className="text-xs text-steel-500">See status, release drafts, drill into progress.</p>
        </a>
        <a href="/projects" className="card block p-5 hover:border-steel-400">
          <p className="text-sm font-medium">Browse projects →</p>
          <p className="text-xs text-steel-500">Project-level steel consumption and completion.</p>
        </a>
      </div>
    </div>
  );
}
