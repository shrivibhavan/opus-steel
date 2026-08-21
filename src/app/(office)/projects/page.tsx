import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { NewProjectForm } from "./NewProjectForm";

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
      // Merge DB projects with default projects so no previous project is ever missing
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-steel-900">Projects</h1>
          <p className="text-sm text-steel-500">Every project, from planning through completion.</p>
        </div>
      </div>

      <NewProjectForm customers={customers} />

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Project #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Work Orders</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-steel-100 last:border-0 hover:bg-steel-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/projects/${p.id}`} className="text-signal-blue hover:underline">
                    {p.projectNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.customer?.name || "N/A"}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">{p._count?.workOrders ?? 0}</td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-steel-400">
                  No projects yet — create the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
