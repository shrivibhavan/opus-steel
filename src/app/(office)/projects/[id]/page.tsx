import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  let project: any = null;

  try {
    project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        workOrders: { include: { items: true, production: true }, orderBy: { createdAt: "desc" } },
        drawings: { include: { revisions: { orderBy: { revision: "desc" } } }, orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { uploadedAt: "desc" } },
        materialTx: { include: { material: true }, orderBy: { date: "desc" }, take: 20 }
      }
    });
  } catch (err) {
    console.error("ProjectDetailPage query error:", err);
  }

  if (!project) {
    notFound();
  }

  const issuedKg = (project.materialTx || [])
    .filter((t: any) => t.txType === "ISSUE")
    .reduce((s: number, t: any) => s + Number(t.weightKg ?? 0), 0);
  const steelUsedKg = (project.workOrders || [])
    .flatMap((w: any) => w.production || [])
    .reduce((s: number, p: any) => s + Number(p.steelUsedKg ?? 0), 0);
  const scrapKg = (project.workOrders || [])
    .flatMap((w: any) => w.production || [])
    .reduce((s: number, p: any) => s + Number(p.scrapKg ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="label-eyebrow">{project.projectNumber}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-steel-900">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm font-medium text-steel-500 mt-1">
          Customer: <span className="text-slate-800 font-semibold">{project.customer?.name || "N/A"}</span> {project.location && `· ${project.location}`}
        </p>
        {project.description && (
          <p className="text-xs text-slate-600 bg-slate-100 p-2.5 rounded border border-slate-200 mt-2">
            {project.description}
          </p>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4 border-t-2 border-t-blue-600">
          <p className="label-eyebrow">Work Orders</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{project.workOrders.length}</p>
        </div>
        <div className="card p-4 border-t-2 border-t-amber-500">
          <p className="label-eyebrow">Steel Issued</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{issuedKg.toLocaleString()} KG</p>
        </div>
        <div className="card p-4 border-t-2 border-t-emerald-600">
          <p className="label-eyebrow">Steel Used</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{steelUsedKg.toLocaleString()} KG</p>
        </div>
        <div className="card p-4 border-t-2 border-t-rose-600">
          <p className="label-eyebrow">Scrap / Wastage</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{scrapKg.toLocaleString()} KG</p>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="table-container">
        <div className="border-b border-steel-200 bg-steel-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Associated Work Orders</h2>
        </div>
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>Work Order #</th>
              <th>Status</th>
              <th className="text-right">Planned Qty</th>
              <th className="text-right">Completed Qty</th>
            </tr>
          </thead>
          <tbody>
            {project.workOrders.map((w: any) => {
              const planned = (w.items || []).reduce((s: number, i: any) => s + Number(i.plannedQuantity ?? 0), 0);
              const completed = (w.production || []).reduce((s: number, p: any) => s + Number(p.completedQuantity ?? 0), 0);
              return (
                <tr key={w.id}>
                  <td className="font-mono text-xs font-bold">
                    <Link href={`/work-orders/${w.id}`} className="text-blue-600 hover:underline">
                      {w.workOrderNumber}
                    </Link>
                  </td>
                  <td><StatusBadge status={w.status} /></td>
                  <td className="text-right font-mono text-xs font-bold tabular-nums">{planned}</td>
                  <td className="text-right font-mono text-xs font-bold tabular-nums text-emerald-700">{completed}</td>
                </tr>
              );
            })}
            {project.workOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-steel-400">
                  No work orders created for this project yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawings & Zoho Attachments */}
      <div className="table-container">
        <div className="border-b border-steel-200 bg-steel-50 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Project Drawings &amp; Zoho Attachments</h2>
          <span className="text-xs font-semibold text-slate-500">{(project.drawings?.length || 0) + (project.attachments?.length || 0)} Files</span>
        </div>
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>File / Drawing Title</th>
              <th>Type</th>
              <th>Revision</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {project.drawings?.map((d: any) => {
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
                        View Drawing
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">No file link</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {project.attachments?.map((att: any) => (
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
            {(project.drawings?.length === 0 && project.attachments?.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-steel-400">
                  No drawings or attachments on file for this project. Attachments uploaded in Zoho Books appear here automatically.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
