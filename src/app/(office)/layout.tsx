import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="flex min-h-screen bg-steel-50">
      <Sidebar role={user.role} userName={user.name} />

      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Topbar Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-steel-200/80 bg-white/90 px-8 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-steel-400">
              OPUS Steel Construction LLC
            </span>
            <span className="h-3 w-px bg-steel-200" />
            <span className="text-xs font-medium text-steel-500">{todayDate}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-steel-100 px-2.5 py-1 text-xs font-semibold text-steel-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Role: {user.role.replaceAll("_", " ")}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
