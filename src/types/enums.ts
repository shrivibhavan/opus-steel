export type Role =
  | "ADMIN"
  | "MANAGEMENT"
  | "OFFICE"
  | "PLANT_MANAGER"
  | "PRODUCTION"
  | "STORE"
  | "QC"
  | "DISPATCH";

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export type WorkOrderStatus =
  | "DRAFT"
  | "RELEASED"
  | "MATERIAL_PENDING"
  | "READY_FOR_PRODUCTION"
  | "IN_PRODUCTION"
  | "PARTIALLY_COMPLETED"
  | "PRODUCTION_COMPLETED"
  | "QC_PENDING"
  | "REWORK"
  | "QC_PASSED"
  | "READY_FOR_DISPATCH"
  | "DISPATCHED"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
