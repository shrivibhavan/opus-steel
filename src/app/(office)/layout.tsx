import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex">
      <Sidebar role={user.role} userName={user.name} />
      <main className="min-h-screen flex-1 bg-steel-50 p-8">{children}</main>
    </div>
  );
}
