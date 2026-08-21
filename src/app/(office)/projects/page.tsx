import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { NewProjectForm } from "./NewProjectForm";

export default async function ProjectsPage() {
  const [projects, customers] = await Promise.all([
    prisma.project.findMany({
      include: { customer: true, _count: { select: { workOrders: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  ]);

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
                <td className="px-4 py-3">{p.customer.name}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">{p._count.workOrders}</td>
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
