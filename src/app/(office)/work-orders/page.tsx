import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { NewWorkOrderForm } from "./NewWorkOrderForm";
import { SyncZohoButton } from "../projects/SyncZohoButton";

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage() {
  let workOrders: any[] = [];
  let projects: any[] = [];

  try {
    const [dbWorkOrders, dbProjects] = await Promise.all([
      prisma.workOrder.findMany({
        include: { project: true, items: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.project.findMany({ include: { customer: true }, orderBy: { name: "asc" } })
    ]);

    workOrders = dbWorkOrders || [];
    projects = dbProjects || [];
  } catch (err) {
    console.error("WorkOrdersPage query error:", err);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-steel-900">Work Orders &amp; Job Sheets</h1>
          <p className="text-sm font-medium text-steel-500">
            Work orders synced from Zoho Books Sales Orders or created in office.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncZohoButton />
          <NewWorkOrderForm projects={projects} />
        </div>
      </div>

      <div className="table-container">
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>WO Number</th>
              <th>Project</th>
              <th>Status</th>
              <th>Priority</th>
              <th className="text-right">Line Items</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map((w) => (
              <tr key={w.id}>
                <td className="font-mono text-xs font-bold">
                  <Link href={`/work-orders/${w.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {w.workOrderNumber}
                  </Link>
                </td>
                <td className="font-semibold text-slate-800">{w.project?.name || "N/A"}</td>
                <td>
                  <StatusBadge status={w.status} />
                </td>
                <td>
                  <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {w.priority}
                  </span>
                </td>
                <td className="text-right font-mono text-xs font-bold text-slate-700 tabular-nums">
                  {w.items?.length || 0}
                </td>
              </tr>
            ))}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-steel-400">
                  No work orders found. Work orders are automatically created when a Sales Order is synced from Zoho Books.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
