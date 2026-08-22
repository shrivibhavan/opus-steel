import React from "react";

interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Positive / Completed states
  ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/80", dot: "bg-emerald-500" },
  COMPLETED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/80", dot: "bg-emerald-500" },
  DISPATCHED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/80", dot: "bg-emerald-500" },
  QC_PASSED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/80", dot: "bg-emerald-500" },
  PASSED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/80", dot: "bg-emerald-500" },
  PRODUCTION_COMPLETED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/80", dot: "bg-emerald-500" },

  // Active / In Progress states
  IN_PRODUCTION: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/80", dot: "bg-blue-500" },
  PARTIALLY_COMPLETED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/80", dot: "bg-blue-500" },
  READY_FOR_PRODUCTION: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/80", dot: "bg-blue-500" },
  READY_FOR_DISPATCH: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200/80", dot: "bg-indigo-500" },
  RELEASED: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200/80", dot: "bg-sky-500" },

  // Pending / Warning states
  PLANNING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/80", dot: "bg-amber-500" },
  MATERIAL_PENDING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/80", dot: "bg-amber-500" },
  QC_PENDING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/80", dot: "bg-amber-500" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/80", dot: "bg-amber-500" },
  CONDITIONAL: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/80", dot: "bg-amber-500" },

  // Critical / Negative states
  REWORK: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/80", dot: "bg-rose-500" },
  FAILED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/80", dot: "bg-rose-500" },
  CANCELLED: { bg: "bg-slate-100", text: "text-slate-500 line-through", border: "border-slate-200", dot: "bg-slate-400" },

  // Neutral states
  DRAFT: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
  ON_HOLD: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" }
};

const DEFAULT_CONFIG: StatusConfig = {
  bg: "bg-slate-100",
  text: "text-slate-700",
  border: "border-slate-200",
  dot: "bg-slate-400"
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || DEFAULT_CONFIG;
  const label = status.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}
