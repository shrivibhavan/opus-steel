import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { NewProjectForm } from "./NewProjectForm";
import { SyncZohoButton } from "./SyncZohoButton";

export const dynamic = "force-dynamic";

const DEFAULT_PROJECTS = [
  {
    id: "demo-prj-1",
    projectNumber: "PRJ-2026-00001",
    name: "Warehouse Structural Steel Frame - Phase 1",
    customer: { id: "cust-1", name: "Al Habtoor Engineering LLC" },
    status: "ACTIVE",
    _count: { workOrders: 2 }
  },
  {
    id: "demo-prj-2",
    projectNumber: "PRJ-2026-00002",
    name: "Commercial Tower Canopy & Facade Support",
    customer: { id: "cust-2", name: "Dubai Contracting Company (DCC)" },
    status: "ACTIVE",
    _count: { workOrders: 1 }
  },
  {
    id: "demo-prj-3",
    projectNumber: "PRJ-ZOHO-001",
    name: "Structural Mezzanine Decking & Steel Stairs",
    customer: { id: "cust-3", name: "Emaar Properties (Zoho Sync)" },
    status: "ACTIVE",
    _count: { workOrders: 1 }
  }
];

const DEFAULT_CUSTOMERS = [
  { id: "cust-1", name: "Al Habtoor Engineering LLC" },
  { id: "cust-2", name: "Dubai Contracting Company (DCC)" },
  { id: "cust-3", name: "Emaar Properties" }
];

export default async function ProjectsPage() {
  let projects: any[] = DEFAULT_PROJECTS;
  let customers: any[] = DEFAULT_CUSTOMERS;

  try {
    const [dbProjects, dbCustomers] = await Promise.all([
      prisma.project.findMany({
        include: { customer: true, _count: { select: { workOrders: true } } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } })
    ]);

    if (dbProjects && dbProjects.length > 0) {
      const dbProjectNumbers = new Set(dbProjects.map((p) => p.projectNumber));
      const missingDefaults = DEFAULT_PROJECTS.filter((p) => !dbProjectNumbers.has(p.projectNumber));
      projects = [...dbProjects, ...missingDefaults];
    }
    if (dbCustomers && dbCustomers.length > 0) {
      customers = dbCustomers;
    }
  } catch (err) {
    console.warn("ProjectsPage using presentation demo fallback:", err);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-steel-900">Projects Directory</h1>
          <p className="text-sm font-medium text-steel-500">
            Manage contract portfolios, customer links, and active fabrication work orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncZohoButton />
          <NewProjectForm customers={customers} />
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="table-container">
        <table className="table-enterprise">
          <thead>
            <tr>
              <th>Project Number</th>
              <th>Project Name</th>
              <th>Customer</th>
              <th>Status</th>
              <th className="text-right">Work Orders</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs font-bold">
                  <Link href={`/projects/${p.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {p.projectNumber}
                  </Link>
                </td>
                <td className="font-semibold text-slate-800">{p.name}</td>
                <td>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {p.customer?.name || "N/A"}
                  </span>
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td className="text-right font-mono text-xs font-bold text-slate-700 tabular-nums">
                  {p._count?.workOrders ?? 0}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-steel-400">
                  No projects yet — create one above or click Sync Zoho Books.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
