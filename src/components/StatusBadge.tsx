const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-steel-100 text-steel-600",
  ON_HOLD: "bg-steel-100 text-steel-600",
  CANCELLED: "bg-steel-200 text-steel-500 line-through",

  RELEASED: "bg-blue-50 text-signal-blue",
  MATERIAL_PENDING: "bg-orange-50 text-signal-orange",
  READY_FOR_PRODUCTION: "bg-blue-50 text-signal-blue",
  IN_PRODUCTION: "bg-blue-50 text-signal-blue",
  PARTIALLY_COMPLETED: "bg-blue-50 text-signal-blue",
  PRODUCTION_COMPLETED: "bg-green-50 text-signal-green",

  QC_PENDING: "bg-orange-50 text-signal-orange",
  REWORK: "bg-red-50 text-signal-red",
  QC_PASSED: "bg-green-50 text-signal-green",
  FAILED: "bg-red-50 text-signal-red",
  PASSED: "bg-green-50 text-signal-green",
  PENDING: "bg-orange-50 text-signal-orange",
  CONDITIONAL: "bg-orange-50 text-signal-orange",

  READY_FOR_DISPATCH: "bg-blue-50 text-signal-blue",
  DISPATCHED: "bg-green-50 text-signal-green",
  COMPLETED: "bg-green-50 text-signal-green",

  PLANNING: "bg-steel-100 text-steel-600",
  ACTIVE: "bg-blue-50 text-signal-blue"
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? "bg-steel-100 text-steel-600";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
