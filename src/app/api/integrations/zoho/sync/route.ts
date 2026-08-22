import { NextResponse } from "next/server";
import { syncAllFromZoho } from "@/lib/zoho";

export const dynamic = "force-dynamic";

/**
 * Full sync endpoint: Pulls Customers, Projects, Sales Orders, Invoices & Estimates
 * from Zoho Books into OPUS Steel.
 */
export async function POST() {
  try {
    const result = await syncAllFromZoho();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Zoho sync failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${result.summary?.total} records from Zoho Books (${result.summary?.customers} customers, ${result.summary?.projects} projects, ${result.summary?.salesOrders} sales orders, ${result.summary?.invoices} invoices, ${result.summary?.estimates} quotations)`,
      summary: result.summary,
      details: result.details
    });
  } catch (err: any) {
    console.error("[Zoho Sync Trigger Error]:", err);
    return NextResponse.json({ error: err.message || "Zoho sync failed" }, { status: 500 });
  }
}
