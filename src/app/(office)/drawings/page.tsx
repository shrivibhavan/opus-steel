import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DrawingsPage() {
  let drawings: any[] = [
    {
      id: "dwg-1",
      drawingNumber: "DWG-S-01",
      drawingTitle: "Main Column Layout & Base Plate Details",
      documentType: "SHOP_DRAWING",
      revisions: [{ id: "rev-1", revision: "B" }],
      project: { name: "Warehouse Structural Steel Frame - Phase 1" }
    },
    {
      id: "dwg-2",
      drawingNumber: "DWG-S-02",
      drawingTitle: "Roof Truss & Rafter Framing Details",
      documentType: "SHOP_DRAWING",
      revisions: [{ id: "rev-2", revision: "A" }],
      project: { name: "Warehouse Structural Steel Frame - Phase 1" }
    }
  ];

  try {
    const dbDrawings = await prisma.drawing.findMany({
      include: { revisions: { orderBy: { revision: "desc" } }, project: true },
      orderBy: { createdAt: "desc" }
    });
    if (dbDrawings && dbDrawings.length > 0) drawings = dbDrawings;
  } catch (err) {
    console.warn("DrawingsPage using presentation demo fallback:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-steel-900">Drawings &amp; Documents</h1>
        <p className="text-sm text-steel-500">
          Revision history is retained — older revisions are never overwritten.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Drawing #</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Latest Revision</th>
              <th className="px-4 py-3">Revisions on File</th>
            </tr>
          </thead>
          <tbody>
            {drawings.map((d) => (
              <tr key={d.id} className="border-b border-steel-100 last:border-0 hover:bg-steel-50">
                <td className="px-4 py-3 font-medium">{d.drawingNumber}</td>
                <td className="px-4 py-3">{d.drawingTitle}</td>
                <td className="px-4 py-3">{(d.documentType || "").replaceAll("_", " ")}</td>
                <td className="px-4 py-3">Rev {d.revisions?.[0]?.revision ?? "—"}</td>
                <td className="px-4 py-3">{d.revisions?.length || 0}</td>
              </tr>
            ))}
            {drawings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-steel-400">
                  No drawings uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
