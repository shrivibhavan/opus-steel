import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { getCurrentUser } from "@/lib/session";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "PRODUCTION") redirect("/plant");
  redirect("/dashboard");
}
