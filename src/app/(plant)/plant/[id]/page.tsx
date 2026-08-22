import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { ProductionEntryForm } from "./ProductionEntryForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlantWorkOrderPage({ params }: { params: { id: string } }) {
  let workOrder: any = null;
  let processes: any[] = [];

  try {
    const [dbWO, dbProc] = await Promise.all([
      prisma.workOrder.findUnique({
        where: { id: params.id },
        include: {
          project: true,
          items: true,
          drawings: { include: { revisions: { orderBy: { revision: "desc" } } } },
          attachments: true,
          production: { orderBy: { createdAt: "desc" } }
        }
      }),
      prisma.process.findMany({ where: { active: true }, orderBy: { sequence: "asc" } })
    ]);
    workOrder = dbWO;
    processes = dbProc || [];
  } catch (err) {
    console.error("PlantWorkOrderPage query error:", err);
  }

  if (!workOrder) {
    notFound();
  }

  const planned = (workOrder.items || []).reduce((s: number, i: any) => s + Number(i.plannedQuantity ?? 0), 0);
  const completed = (workOrder.production || []).reduce((s: number, p: any) => s + Number(p.completedQuantity ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow">{workOrder.project?.name}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-steel-900">{workOrder.workOrderNumber}</h1>
          <StatusBadge status={workOrder.status} />
        </div>
      </div>

      <div className="card p-5 border-t-2 border-t-blue-600">
        <ProgressBar percent={planned > 0 ? (completed / planned) * 100 : 0} />
        <p className="mt-2 text-xs font-semibold text-steel-600 tabular-nums">
          {completed} / {planned} units completed
        </p>
      </div>

      {/* Items List */}
      <div className="card p-4">
        <p className="label-eyebrow mb-2">Items to produce</p>
        <ul className="space-y-1.5 text-sm">
          {(workOrder.items || []).map((it: any) => (
            <li key={it.id} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0">
              <span className="font-semibold text-slate-800">{it.description}</span>
              <span className="font-mono text-xs font-bold text-blue-700">
                {Number(it.plannedQuantity)} {it.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Drawings & Documents section */}
      {((workOrder.drawings && workOrder.drawings.length > 0) || (workOrder.attachments && workOrder.attachments.length > 0)) && (
        <div className="card p-4">
          <p className="label-eyebrow mb-2">Shop Drawings &amp; Documents</p>
          <div className="space-y-2">
            {workOrder.drawings?.map((d: any) => {
              const rev = d.revisions?.[0];
              return (
                <div key={d.id} className="flex items-center justify-between rounded bg-slate-50 p-2 border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{d.drawingTitle}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Rev {rev?.revision || "00"}</p>
                  </div>
                  {rev?.fileKey && (
                    <a
                      href={rev.fileKey}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      View Drawing
                    </a>
                  )}
                </div>
              );
            })}
            {workOrder.attachments?.map((att: any) => (
              <div key={att.id} className="flex items-center justify-between rounded bg-slate-50 p-2 border border-slate-200">
                <p className="text-xs font-bold text-slate-800">{att.fileName}</p>
                <a
                  href={att.fileKey}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Download ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProductionEntryForm workOrderId={workOrder.id} processes={processes} />

      {/* Recent Production Entries */}
      <div className="table-container">
        <div className="border-b border-steel-200 bg-steel-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Recent Production Entries</h2>
        </div>
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>Entry #</th>
              <th className="text-right">Completed Qty</th>
              <th className="text-right">Steel Used</th>
              <th className="text-right">Scrap</th>
            </tr>
          </thead>
          <tbody>
            {(workOrder.production || []).map((p: any) => (
              <tr key={p.id}>
                <td className="font-mono text-xs font-bold text-slate-900">{p.entryNumber}</td>
                <td className="text-right font-mono text-xs font-bold text-emerald-700 tabular-nums">{Number(p.completedQuantity)}</td>
                <td className="text-right font-mono text-xs font-bold tabular-nums">{Number(p.steelUsedKg)} KG</td>
                <td className="text-right font-mono text-xs font-bold text-rose-700 tabular-nums">{Number(p.scrapKg)} KG</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
