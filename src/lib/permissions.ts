import type { Role } from "@/types/enums";

// Central RBAC table. Every server action / API route must check this —
// never rely on the frontend hiding a button.
export const PERMISSIONS = {
  PROJECT_CREATE: ["ADMIN", "OFFICE"],
  PROJECT_EDIT: ["ADMIN", "OFFICE"],
  PROJECT_VIEW_ALL: ["ADMIN", "MANAGEMENT", "OFFICE", "PLANT_MANAGER"],

  WORK_ORDER_CREATE: ["ADMIN", "OFFICE"],
  WORK_ORDER_EDIT_COMMERCIAL: ["ADMIN", "OFFICE"],
  WORK_ORDER_RELEASE: ["ADMIN", "OFFICE"],
  WORK_ORDER_DELETE: ["ADMIN"], // deletion is otherwise disallowed; see audit rules
  WORK_ORDER_VIEW: [
    "ADMIN",
    "MANAGEMENT",
    "OFFICE",
    "PLANT_MANAGER",
    "PRODUCTION",
    "STORE",
    "QC",
    "DISPATCH"
  ],

  DRAWING_UPLOAD: ["ADMIN", "OFFICE"],

  MATERIAL_MANAGE: ["ADMIN", "STORE"],
  MATERIAL_ISSUE: ["ADMIN", "STORE"],
  MATERIAL_VIEW: ["ADMIN", "MANAGEMENT", "OFFICE", "STORE", "PLANT_MANAGER", "PRODUCTION"],

  PRODUCTION_ENTRY_CREATE: ["ADMIN", "PRODUCTION", "PLANT_MANAGER"],
  PRODUCTION_VIEW: ["ADMIN", "MANAGEMENT", "OFFICE", "PLANT_MANAGER", "PRODUCTION"],

  QC_CREATE: ["ADMIN", "QC"],
  QC_VIEW: ["ADMIN", "MANAGEMENT", "OFFICE", "QC", "PLANT_MANAGER"],

  DISPATCH_CREATE: ["ADMIN", "DISPATCH"],
  DISPATCH_VIEW: ["ADMIN", "MANAGEMENT", "OFFICE", "DISPATCH"],

  REPORTS_VIEW: ["ADMIN", "MANAGEMENT", "OFFICE"],
  USER_MANAGE: ["ADMIN"]
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function assertCan(role: Role | undefined | null, permission: PermissionKey) {
  if (!can(role, permission)) {
    const err = new Error(`Forbidden: role ${role ?? "none"} lacks ${permission}`);
    (err as any).status = 403;
    throw err;
  }
}
