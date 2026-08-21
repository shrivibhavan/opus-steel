import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { ProductionEntryForm } from "./ProductionEntryForm";

export const dynamic = "force-dynamic";

export default async function PlantWorkOrderPage({ params }: { params: { id: string } }) {
  let workOrder: any = null;
  let processes: any[] = [
    { id: "proc-1", name: "Cutting & Sawing", code: "CUTTING" },
    { id: "proc-2", name: "Fit-Up & Welding", code: "WELDING" },
    { id: "proc-3", name: "Blasting & Painting", code: "PAINTING" }
  ];

  try {
    const [dbWO, dbProc] = await Promise.all([
      prisma.workOrder.findUnique({
        where: { id: params.id },
        include: { project: true, items: true, production: { orderBy: { createdAt: "desc" } } }
      }),
      prisma.process.findMany({ where: { active: true }, orderBy: { sequence: "asc" } })
    ]);
    workOrder = dbWO;
    if (dbProc && dbProc.length > 0) processes = dbProc;
  } catch (err) {
    console.warn("PlantWorkOrderPage using presentation demo fallback:", err);
  }

  if (!workOrder) {
    workOrder = {
      id: params.id,
      workOrderNumber: "WO-2026-00001",
      status: "IN_PRODUCTION",
      project: { name: "Warehouse Structural Steel Frame - Phase 1" },
      items: [
        { id: "i1", description: "Built-up Columns (UC 356x368x153)", plannedQuantity: 50, unit: "Pcs", drawingNumber: "DWG-S-01" },
        { id: "i2", description: "Roof Beams (UB 457x191x89)", plannedQuantity: 50, unit: "Pcs", drawingNumber: "DWG-S-02" }
      ],
      production: [
        { id: "p1", entryNumber: "PROD-2026-00001", completedQuantity: 45, steelUsedKg: 4700, scrapKg: 180 }
      ]
    };
  }

  const planned = (workOrder.items || []).reduce((s: number, i: any) => s + Number(i.plannedQuantity ?? 0), 0);
  const completed = (workOrder.production || []).reduce((s: number, p: any) => s + Number(p.completedQuantity ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow">{workOrder.project?.name}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-steel-900">{workOrder.workOrderNumber}</h1>
          <StatusBadge status={workOrder.status} />
        </div>
      </div>

      <div className="card p-5">
        <ProgressBar percent={planned > 0 ? (completed / planned) * 100 : 0} />
        <p className="mt-1 text-xs text-steel-500">{completed} / {planned} completed</p>
      </div>

      <div className="card p-4">
        <p className="label-eyebrow mb-2">Items to produce</p>
        <ul className="space-y-1 text-sm">
          {(workOrder.items || []).map((it: any) => (
            <li key={it.id}>
              {it.description} — {Number(it.plannedQuantity)} {it.unit}
              {it.drawingNumber && <span className="text-steel-400"> · Drawing {it.drawingNumber}</span>}
            </li>
          ))}
        </ul>
      </div>

      <ProductionEntryForm workOrderId={workOrder.id} processes={processes} />

      <div className="card overflow-hidden">
        <div className="border-b border-steel-200 px-4 py-3">
          <p className="text-sm font-medium">Recent entries</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Entry #</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Steel Used</th>
              <th className="px-4 py-3">Scrap</th>
            </tr>
          </thead>
          <tbody>
            {(workOrder.production || []).map((p: any) => (
              <tr key={p.id} className="border-b border-steel-100 last:border-0">
                <td className="px-4 py-3 font-medium">{p.entryNumber}</td>
                <td className="px-4 py-3">{Number(p.completedQuantity)}</td>
                <td className="px-4 py-3">{Number(p.steelUsedKg)} KG</td>
                <td className="px-4 py-3">{Number(p.scrapKg)} KG</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
