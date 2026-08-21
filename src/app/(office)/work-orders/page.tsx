import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { NewWorkOrderForm } from "./NewWorkOrderForm";

export const dynamic = "force-dynamic";

const DEFAULT_WORK_ORDERS = [
  {
    id: "demo-wo-1",
    workOrderNumber: "WO-2026-00001",
    project: { name: "Warehouse Structural Steel Frame - Phase 1" },
    status: "IN_PRODUCTION",
    priority: "HIGH",
    items: [{ id: "item-1" }, { id: "item-2" }]
  },
  {
    id: "demo-wo-2",
    workOrderNumber: "WO-2026-00002",
    project: { name: "Commercial Tower Canopy & Facade Support" },
    status: "RELEASED",
    priority: "NORMAL",
    items: [{ id: "item-3" }]
  },
  {
    id: "demo-wo-3",
    workOrderNumber: "WO-ZOHO-001",
    project: { name: "Structural Mezzanine Decking & Steel Stairs" },
    status: "DRAFT",
    priority: "NORMAL",
    items: [{ id: "item-4" }, { id: "item-5" }]
  }
];

export default async function WorkOrdersPage() {
  let workOrders: any[] = DEFAULT_WORK_ORDERS;
  let projects: any[] = [
    { id: "demo-prj-1", name: "Warehouse Structural Steel Frame - Phase 1", customer: { name: "Al Habtoor Engineering LLC" } },
    { id: "demo-prj-2", name: "Commercial Tower Canopy & Facade Support", customer: { name: "Dubai Contracting Company (DCC)" } }
  ];

  try {
    const [dbWorkOrders, dbProjects] = await Promise.all([
      prisma.workOrder.findMany({
        include: { project: true, items: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.project.findMany({ include: { customer: true }, orderBy: { name: "asc" } })
    ]);

    if (dbWorkOrders && dbWorkOrders.length > 0) {
      const dbWONumbers = new Set(dbWorkOrders.map((w) => w.workOrderNumber));
      const missingDefaults = DEFAULT_WORK_ORDERS.filter((w) => !dbWONumbers.has(w.workOrderNumber));
      workOrders = [...dbWorkOrders, ...missingDefaults];
    }
    if (dbProjects && dbProjects.length > 0) {
      projects = dbProjects;
    }
  } catch (err) {
    console.warn("WorkOrdersPage using presentation demo fallback:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-steel-900">Work Orders</h1>
        <p className="text-sm text-steel-500">
          Draft here, then release — released orders appear immediately in the plant queue.
        </p>
      </div>

      <NewWorkOrderForm projects={projects} />

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">WO #</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Items</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map((w) => (
              <tr key={w.id} className="border-b border-steel-100 last:border-0 hover:bg-steel-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/work-orders/${w.id}`} className="text-signal-blue hover:underline">
                    {w.workOrderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{w.project?.name || "N/A"}</td>
                <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                <td className="px-4 py-3">{w.priority}</td>
                <td className="px-4 py-3">{w.items?.length || 0}</td>
              </tr>
            ))}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-steel-400">
                  No work orders yet — create the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
