import { prisma } from "@/lib/prisma";

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    include: { transactions: true, supplier: true },
    orderBy: { materialName: "asc" }
  });

  const rows = materials.map((m) => {
    const stockKg = m.transactions.reduce((sum, t) => {
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
        <h1 className="text-xl font-semibold text-steel-900">Materials</h1>
        <p className="text-sm text-steel-500">
          Stock is calculated from the transaction ledger — every receipt, issue and return.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Stock (KG)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-steel-100 last:border-0 hover:bg-steel-50">
                <td className="px-4 py-3 font-medium">{m.materialCode}</td>
                <td className="px-4 py-3">{m.materialName}</td>
                <td className="px-4 py-3">{m.materialType.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{m.grade ?? "—"}</td>
                <td className="px-4 py-3">{m.size ?? "—"}</td>
                <td className="px-4 py-3">{m.stockKg.toFixed(1)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-steel-400">
                  No materials yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
