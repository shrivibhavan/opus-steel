import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  let materials: any[] = [];

  try {
    const dbMaterials = await prisma.material.findMany({
      include: { transactions: true, supplier: true },
      orderBy: { materialName: "asc" }
    });
    materials = dbMaterials || [];
  } catch (err) {
    console.error("MaterialsPage query error:", err);
  }

  const rows = materials.map((m) => {
    const stockKg = (m.transactions || []).reduce((sum: number, t: any) => {
      const w = Number(t.weightKg ?? 0);
      if (t.txType === "RECEIPT" || t.txType === "RETURN") return sum + w;
      if (t.txType === "ISSUE" || t.txType === "SCRAP") return sum - w;
      return sum;
    }, 0);
    return { ...m, stockKg };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Materials Inventory Ledger</h1>
        <p className="text-sm font-medium text-steel-500">
          Stock levels derived in real-time from transaction ledger (receipts, issues, returns).
        </p>
      </div>

      <div className="table-container">
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>Material Code</th>
              <th>Material Name</th>
              <th>Type</th>
              <th>Grade</th>
              <th>Size</th>
              <th className="text-right">Stock Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="font-mono text-xs font-bold text-slate-900">{m.materialCode}</td>
                <td className="font-semibold text-slate-800">{m.materialName}</td>
                <td>
                  <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {(m.materialType || "").replaceAll("_", " ")}
                  </span>
                </td>
                <td className="font-mono text-xs text-slate-600">{m.grade ?? "—"}</td>
                <td className="text-xs text-slate-600">{m.size ?? "—"}</td>
                <td className="text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {m.stockKg.toLocaleString()} {m.unit || "KG"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-steel-400">
                  No materials recorded in database inventory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
