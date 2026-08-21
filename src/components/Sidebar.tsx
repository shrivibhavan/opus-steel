"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const OFFICE_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/work-orders", label: "Work Orders" },
  { href: "/drawings", label: "Drawings" },
  { href: "/materials", label: "Materials" },
  { href: "/settings/zoho", label: "Zoho Books" }
];

export function Sidebar({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();
  const nav = role === "PRODUCTION" || role === "PLANT_MANAGER" || role === "STORE"
    ? [{ href: "/plant", label: "Plant Floor" }, ...(role !== "PRODUCTION" ? [{ href: "/materials", label: "Materials" }] : [])]
    : OFFICE_NAV;

  return (
    <aside className="flex h-screen w-56 flex-col justify-between border-r border-steel-200 bg-white">
      <div>
        <div className="border-b border-steel-200 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-steel-900 text-sm font-bold text-white">
              O
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">OPUS Steel</p>
              <p className="text-xs text-steel-500">Production Platform</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-steel-800 text-white" : "text-steel-700 hover:bg-steel-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-steel-200 p-4">
        <p className="text-sm font-medium">{userName}</p>
        <p className="mb-2 text-xs text-steel-500">{role.replaceAll("_", " ")}</p>
        <button className="text-xs text-signal-blue hover:underline" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
