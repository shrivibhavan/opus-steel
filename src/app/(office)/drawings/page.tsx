import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DrawingsPage() {
  let drawings: any[] = [];
  let attachments: any[] = [];

  try {
    const [dbDrawings, dbAttachments] = await Promise.all([
      prisma.drawing.findMany({
        include: {
          revisions: { orderBy: { revision: "desc" } },
          project: true,
          workOrder: true
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.attachment.findMany({
        include: { project: true, workOrder: true },
        orderBy: { uploadedAt: "desc" }
      })
    ]);

    drawings = dbDrawings || [];
    attachments = dbAttachments || [];
  } catch (err) {
    console.error("DrawingsPage query error:", err);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Drawings &amp; Technical Documents</h1>
        <p className="text-sm font-medium text-steel-500">
          Drawings &amp; attachments synced directly from Zoho Books work orders/projects, plus shop drawings uploaded in OPUS Steel.
        </p>
      </div>

      {/* Drawings Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Shop Drawings &amp; Revision History</h2>
          <span className="text-xs font-semibold text-slate-500">{drawings.length} Drawings on file</span>
        </div>

        <div className="table-container">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Drawing #</th>
                <th>Title</th>
                <th>Project / Work Order</th>
                <th>Type</th>
                <th>Latest Rev</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {drawings.map((d) => {
                const latestRev = d.revisions?.[0];
                const fileUrl = latestRev?.fileKey || "#";

                return (
                  <tr key={d.id}>
                    <td className="font-mono text-xs font-bold text-slate-900">{d.drawingNumber}</td>
                    <td className="font-semibold text-slate-800">{d.drawingTitle}</td>
                    <td>
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {d.project?.name || d.workOrder?.workOrderNumber || "General"}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {(d.documentType || "SHOP_DRAWING").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="font-mono text-xs font-bold text-slate-700">
                      Rev {latestRev?.revision ?? "00"}
                    </td>
                    <td className="text-right">
                      {latestRev?.fileKey ? (
                        <a
                          href={latestRev.fileKey}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-subtle hover:bg-blue-700 transition"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View File
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No file link</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {drawings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-steel-400">
                    No drawings synced or uploaded yet. Upload drawings in Zoho Books when creating work orders or projects to see them here automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attachments Section */}
      {attachments.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Synced Attachments &amp; Files</h2>
            <span className="text-xs font-semibold text-slate-500">{attachments.length} Attachments</span>
          </div>

          <div className="table-container">
            <table className="table-enterprise">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Project / Work Order</th>
                  <th>MIME Type</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((att) => (
                  <tr key={att.id}>
                    <td className="font-semibold text-slate-800">{att.fileName}</td>
                    <td>
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {att.project?.name || att.workOrder?.workOrderNumber || "General"}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-500">{att.mimeType || "document"}</td>
                    <td className="text-xs text-slate-500">
                      {new Date(att.uploadedAt).toLocaleDateString()}
                    </td>
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
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
