import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      workOrders: { include: { items: true, production: true }, orderBy: { createdAt: "desc" } },
      materialTx: { include: { material: true }, orderBy: { date: "desc" }, take: 20 }
    }
  });
  if (!project) notFound();

  const issuedKg = project.materialTx
    .filter((t) => t.txType === "ISSUE")
    .reduce((s, t) => s + Number(t.weightKg ?? 0), 0);
  const steelUsedKg = project.workOrders
    .flatMap((w) => w.production)
    .reduce((s, p) => s + Number(p.steelUsedKg), 0);
  const scrapKg = project.workOrders
    .flatMap((w) => w.production)
    .reduce((s, p) => s + Number(p.scrapKg), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow">{project.projectNumber}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-steel-900">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm text-steel-500">
          {project.customer.name} {project.location && `· ${project.location}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="label-eyebrow">Work Orders</p>
          <p className="text-xl font-semibold">{project.workOrders.length}</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Steel Issued</p>
          <p className="text-xl font-semibold">{issuedKg.toFixed(0)} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Steel Used</p>
          <p className="text-xl font-semibold">{steelUsedKg.toFixed(0)} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Scrap</p>
          <p className="text-xl font-semibold">{scrapKg.toFixed(0)} KG</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-steel-200 px-4 py-3">
          <p className="text-sm font-medium">Work Orders</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">WO #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Planned Qty</th>
              <th className="px-4 py-3">Completed Qty</th>
            </tr>
          </thead>
          <tbody>
            {project.workOrders.map((w) => {
              const planned = w.items.reduce((s, i) => s + Number(i.plannedQuantity), 0);
              const completed = w.production.reduce((s, p) => s + Number(p.completedQuantity), 0);
              return (
                <tr key={w.id} className="border-b border-steel-100 last:border-0 hover:bg-steel-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/work-orders/${w.id}`} className="text-signal-blue hover:underline">
                      {w.workOrderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                  <td className="px-4 py-3">{planned}</td>
                  <td className="px-4 py-3">{completed}</td>
                </tr>
              );
            })}
            {project.workOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-steel-400">
                  No work orders on this project yet.{" "}
                  <Link href="/work-orders" className="text-signal-blue hover:underline">
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
