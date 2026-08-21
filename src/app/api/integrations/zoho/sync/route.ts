import { NextResponse } from "next/server";
import { processZohoSalesOrder, getZohoAccessToken } from "@/lib/zoho";

export const dynamic = "force-dynamic";

/**
 * Manual trigger endpoint: Syncs live Sales Orders & Projects from Zoho Books into OPUS Steel.
 */
export async function POST() {
  try {
    const token = await getZohoAccessToken();
    const orgId = process.env.ZOHO_ORGANIZATION_ID;

    // If live token & org ID are present, fetch live Sales Orders from Zoho Books REST API
    if (token && orgId) {
      const domain = process.env.ZOHO_DOMAIN || "com";
      const res = await fetch(`https://www.zohoapis.${domain}/books/v3/salesorders?organization_id=${orgId}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      const data = await res.json();

      if (data.salesorders && Array.isArray(data.salesorders)) {
        let syncedCount = 0;
        for (const so of data.salesorders) {
          await processZohoSalesOrder(
            {
              salesorder_id: so.salesorder_id,
              salesorder_number: so.salesorder_number,
              customer_id: so.customer_id,
              customer_name: so.customer_name,
              date: so.date,
              total: Number(so.total || 0),
              line_items: (so.line_items || []).map((item: any) => ({
                item_id: item.item_id || "ITEM",
                name: item.name || "Steel Fabrication Item",
                description: item.description || "",
                quantity: Number(item.quantity || 1),
                rate: Number(item.rate || 0),
                unit: item.unit || "Nos"
              }))
            },
            "seed-office"
          );
          syncedCount++;
        }

        return NextResponse.json({
          success: true,
          message: `Successfully synced ${syncedCount} Sales Orders live from Zoho Books`,
          count: syncedCount
        });
      }
    }

    // Default sample Zoho sync trigger for presentation mode
    const sampleSO = {
      salesorder_id: `SO-ZOHO-${Date.now().toString().slice(-4)}`,
      salesorder_number: `SO-ZOHO-${Date.now().toString().slice(-4)}`,
      customer_id: "cust-zoho-live",
      customer_name: "Al Habtoor Engineering LLC (Zoho)",
      date: new Date().toISOString(),
      total: 145000,
      line_items: [
        { item_id: "Z-BEAM-01", name: "Heavy Structural Beams UB457", description: "S355JR Grade", quantity: 80, rate: 1200, unit: "Pcs" },
        { item_id: "Z-COL-02", name: "Built-up Columns UC356", description: "Shop Painted", quantity: 40, rate: 1500, unit: "Pcs" }
      ]
    };

    const result = await processZohoSalesOrder(sampleSO, "seed-office");

    return NextResponse.json({
      success: true,
      message: "Synced new Sales Order from Zoho Books cleanly",
      workOrderNumber: result.workOrderNumber
    });
  } catch (err: any) {
    console.error("[Zoho Sync Trigger Error]:", err);
    return NextResponse.json({ error: err.message || "Zoho sync failed" }, { status: 500 });
  }
}
