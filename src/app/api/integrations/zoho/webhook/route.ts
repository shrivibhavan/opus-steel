import { NextRequest, NextResponse } from "next/server";
import { processZohoSalesOrder, processZohoDirectProject } from "@/lib/zoho";

export const dynamic = "force-dynamic";

/**
 * Inbound Webhook listener for Zoho Books & Zoho CRM.
 * Configured in Zoho Books → Settings → Automation → Webhooks.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. Check for Zoho Direct Project Creation payload
    const project = payload.project || payload;
    if (project && (project.project_name || project.project_id)) {
      const result = await processZohoDirectProject(
        {
          project_id: project.project_id || project.id,
          project_name: project.project_name || project.name || "Zoho Project",
          customer_name: project.customer_name || project.account_name || "Zoho Client"
        },
        "seed-office"
      );

      return NextResponse.json({
        success: true,
        message: "Zoho Project created in OPUS Steel",
        projectNumber: result.projectNumber,
        projectId: result.id
      });
    }

    // 2. Check for Zoho Sales Order event payload
    const salesOrder = payload.salesorder || payload;

    if (salesOrder && (salesOrder.salesorder_id || salesOrder.salesorder_number)) {
      const result = await processZohoSalesOrder(
        {
          salesorder_id: salesOrder.salesorder_id || `SO-${Date.now()}`,
          salesorder_number: salesOrder.salesorder_number || salesOrder.subject || `SO-${Date.now()}`,
          customer_id: salesOrder.customer_id || salesOrder.account_id || "zoho-generic",
          customer_name: salesOrder.customer_name || salesOrder.account_name || "Zoho Customer",
          date: salesOrder.date || new Date().toISOString(),
          total: Number(salesOrder.total || 0),
          line_items: (salesOrder.line_items || []).map((item: any) => ({
            item_id: item.item_id || item.product_id || "ITEM",
            name: item.name || item.product_name || "Fabrication Item",
            description: item.description || "",
            quantity: Number(item.quantity || 1),
            rate: Number(item.rate || 0),
            unit: item.unit || "Nos"
          }))
        },
        "seed-office"
      );

      return NextResponse.json({
        success: true,
        message: "Zoho Sales Order processed into OPUS Steel",
        workOrderNumber: result.workOrderNumber
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook received (No sales order or project payload detected)"
    });
  } catch (err: any) {
    console.error("[Zoho Webhook Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process Zoho Webhook" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Active",
    service: "OPUS Steel — Zoho Integration Webhook Listener",
    timestamp: new Date().toISOString()
  });
}
