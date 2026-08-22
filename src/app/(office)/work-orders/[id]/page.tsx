import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { ReleaseButton } from "./ReleaseButton";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  let workOrder: any = null;
  let user: any = null;

  try {
    const [dbWO, dbUser] = await Promise.all([
      prisma.workOrder.findUnique({
        where: { id: params.id },
        include: {
          project: { include: { customer: true } },
          items: true,
          drawings: { include: { revisions: { orderBy: { revision: "desc" } } } },
          attachments: true,
          materialTx: { include: { material: true }, orderBy: { date: "desc" } },
          production: { orderBy: { createdAt: "desc" }, include: { process: true } },
          qcInspections: true,
          dispatches: true
        }
      }),
      getCurrentUser()
    ]);
    workOrder = dbWO;
    user = dbUser;
  } catch (err) {
    console.error("WorkOrderDetailPage query error:", err);
  }

  if (!workOrder) {
    notFound();
  }

  const plannedQty = (workOrder.items || []).reduce((s: number, i: any) => s + Number(i.plannedQuantity ?? 0), 0);
  const completedQty = (workOrder.production || []).reduce((s: number, p: any) => s + Number(p.completedQuantity ?? 0), 0);
  const progressPercent = plannedQty > 0 ? (completedQty / plannedQty) * 100 : 0;

  const issuedKg = (workOrder.materialTx || [])
    .filter((t: any) => t.txType === "ISSUE")
    .reduce((s: number, t: any) => s + Number(t.weightKg ?? 0), 0);
  const usedKg = (workOrder.production || []).reduce((s: number, p: any) => s + Number(p.steelUsedKg ?? 0), 0);
  const scrapKg = (workOrder.production || []).reduce((s: number, p: any) => s + Number(p.scrapKg ?? 0), 0);
  const remainingKg = Math.max(issuedKg - usedKg - scrapKg, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-eyebrow">{workOrder.project?.name} · {workOrder.project?.customer?.name}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-steel-900">{workOrder.workOrderNumber}</h1>
            <StatusBadge status={workOrder.status} />
          </div>
          {workOrder.jobDescription && <p className="text-sm font-medium text-steel-500 mt-1">{workOrder.jobDescription}</p>}
        </div>
        {workOrder.status === "DRAFT" && can(user?.role as any, "WORK_ORDER_RELEASE") && (
          <ReleaseButton workOrderId={workOrder.id} />
        )}
      </div>

      <div className="card p-5 border-t-2 border-t-blue-600">
        <p className="label-eyebrow mb-2">Production Progress</p>
        <ProgressBar percent={progressPercent} />
        <p className="mt-2 text-xs font-semibold text-steel-600 tabular-nums">
          {completedQty} / {plannedQty} completed ({progressPercent.toFixed(1)}%)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="label-eyebrow">Steel Issued</p>
          <p className="text-xl font-bold tabular-nums">{issuedKg.toLocaleString()} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Steel Used</p>
          <p className="text-xl font-bold tabular-nums text-emerald-700">{usedKg.toLocaleString()} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Scrap</p>
          <p className="text-xl font-bold tabular-nums text-rose-700">{scrapKg.toLocaleString()} KG</p>
        </div>
        <div className="card p-4">
          <p className="label-eyebrow">Remaining Stock</p>
          <p className="text-xl font-bold tabular-nums">{remainingKg.toLocaleString()} KG</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="table-container">
        <div className="border-b border-steel-200 bg-steel-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Work Order Items &amp; Specifications</h2>
        </div>
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>Description</th>
              <th>Drawing #</th>
              <th className="text-right">Planned Qty</th>
            </tr>
          </thead>
          <tbody>
            {(workOrder.items || []).map((it: any) => (
              <tr key={it.id}>
                <td className="font-semibold text-slate-800">{it.description}</td>
                <td className="font-mono text-xs text-slate-600">{it.drawingNumber ?? "—"}</td>
                <td className="text-right font-mono text-xs font-bold tabular-nums">{Number(it.plannedQuantity)} {it.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attached Drawings & Zoho Documents */}
      <div className="table-container">
        <div className="border-b border-steel-200 bg-steel-50 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Attached Drawings &amp; Documents</h2>
          <span className="text-xs font-semibold text-slate-500">{(workOrder.drawings?.length || 0) + (workOrder.attachments?.length || 0)} Files</span>
        </div>
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>File / Drawing Name</th>
              <th>Type</th>
              <th>Revision</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {workOrder.drawings?.map((d: any) => {
              const rev = d.revisions?.[0];
              return (
                <tr key={d.id}>
                  <td className="font-semibold text-slate-800">{d.drawingTitle}</td>
                  <td>
                    <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {d.documentType?.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="font-mono text-xs font-bold">Rev {rev?.revision || "00"}</td>
                  <td className="text-right">
                    {rev?.fileKey ? (
                      <a
                        href={rev.fileKey}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-subtle hover:bg-blue-700 transition"
                      >
                        View File
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">No file link</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {workOrder.attachments?.map((att: any) => (
              <tr key={att.id}>
                <td className="font-semibold text-slate-800">{att.fileName}</td>
                <td>
                  <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Attachment
                  </span>
                </td>
                <td className="text-xs text-slate-400">—</td>
                <td className="text-right">
                  <a
                    href={att.fileKey}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-subtle hover:bg-slate-50 transition"
                  >
                    Download ↗
                  </a>
                </td>
              </tr>
            ))}
            {(workOrder.drawings?.length === 0 && workOrder.attachments?.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-steel-400">
                  No attached drawings on this work order. Attachments uploaded in Zoho Books appear here automatically.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Production Entries Table */}
      <div className="table-container">
        <div className="border-b border-steel-200 bg-steel-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Production Entries</h2>
        </div>
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>Entry #</th>
              <th>Date</th>
              <th className="text-right">Completed Qty</th>
              <th className="text-right">Steel Used</th>
              <th className="text-right">Scrap</th>
            </tr>
          </thead>
          <tbody>
            {(workOrder.production || []).map((p: any) => (
              <tr key={p.id}>
                <td className="font-mono text-xs font-bold text-slate-900">{p.entryNumber}</td>
                <td className="text-xs text-slate-600">{new Date(p.productionDate).toISOString().slice(0, 10)}</td>
                <td className="text-right font-mono text-xs font-bold text-emerald-700 tabular-nums">{Number(p.completedQuantity)}</td>
                <td className="text-right font-mono text-xs font-bold tabular-nums">{Number(p.steelUsedKg)} KG</td>
                <td className="text-right font-mono text-xs font-bold text-rose-700 tabular-nums">{Number(p.scrapKg)} KG</td>
              </tr>
            ))}
            {(workOrder.production || []).length === 0 && (
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
