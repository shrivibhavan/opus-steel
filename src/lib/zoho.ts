import { prisma } from "./prisma";

// Zoho API Credentials from Environment Variables
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "1000.2HVC6CRCDAUYU003S16AIA83J4MTET";
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "f75bb1f009bb925aae5e2393b5f9b1ed8b27345144";
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || "";
const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID || "";
const ZOHO_DOMAIN = process.env.ZOHO_DOMAIN || "com"; // "com", "eu", "in", etc.

export interface ZohoSalesOrderPayload {
  salesorder_id: string;
  salesorder_number: string;
  customer_id: string;
  customer_name: string;
  date: string;
  total: number;
  line_items: Array<{
    item_id: string;
    name: string;
    description?: string;
    quantity: number;
    rate: number;
    unit?: string;
  }>;
}

/**
 * Exchanges the Refresh Token for an Access Token from Zoho OAuth server.
 */
export async function getZohoAccessToken(): Promise<string | null> {
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.log("[Zoho Integration] Credentials missing for outbound OAuth token.");
    return null;
  }

  try {
    const tokenUrl = `https://accounts.zoho.${ZOHO_DOMAIN}/oauth/v2/token?refresh_token=${ZOHO_REFRESH_TOKEN}&client_id=${ZOHO_CLIENT_ID}&client_secret=${ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
    const res = await fetch(tokenUrl, { method: "POST" });
    const data = await res.json();

    if (data.access_token) {
      return data.access_token;
    }
    console.error("[Zoho OAuth Error]:", data);
    return null;
  } catch (err) {
    console.error("[Zoho OAuth Exception]:", err);
    return null;
  }
}

/**
 * Returns current Zoho connection status and settings metadata.
 */
export async function getZohoIntegrationStatus() {
  const hasClientKeys = !!(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET);
  const hasFullConfig = !!(hasClientKeys && ZOHO_REFRESH_TOKEN && ZOHO_ORGANIZATION_ID);

  let statusText = "Inbound Webhook Ready (Receiving Sales Orders)";
  if (hasFullConfig) {
    const token = await getZohoAccessToken();
    statusText = token ? "Connected & Active (Full 2-Way Sync)" : "Inbound Active (Outbound OAuth Token Pending)";
  } else if (hasClientKeys) {
    statusText = "Zoho OAuth App Registered & Inbound Webhook Active";
  }

  return {
    connected: true, // Inbound webhook is ready out of the box!
    inboundActive: true,
    outboundActive: hasFullConfig,
    organizationId: ZOHO_ORGANIZATION_ID || "Optional (Needed for automatic invoice generation)",
    clientId: ZOHO_CLIENT_ID ? `${ZOHO_CLIENT_ID.substring(0, 10)}...` : "Not Set",
    statusText,
    webhookUrl: `${process.env.NEXTAUTH_URL || "https://app.opusengg.com"}/api/integrations/zoho/webhook`
  };
}

/**
 * Maps a Zoho Sales Order into OPUS Steel Project & Work Order.
 */
export async function processZohoSalesOrder(salesOrder: ZohoSalesOrderPayload, createdByUserId: string) {
  // 1. Upsert Customer
  const customer = await prisma.customer.upsert({
    where: { id: `zoho-cust-${salesOrder.customer_id}` },
    create: {
      id: `zoho-cust-${salesOrder.customer_id}`,
      name: salesOrder.customer_name || "Zoho Customer",
      notes: `Synced from Zoho Books Customer ID: ${salesOrder.customer_id}`
    },
    update: {
      name: salesOrder.customer_name
    }
  });

  // 2. Upsert Project
  const projectNumber = `PRJ-ZOHO-${salesOrder.salesorder_number}`;
  const project = await prisma.project.upsert({
    where: { projectNumber },
    create: {
      projectNumber,
      name: `Zoho SO: ${salesOrder.salesorder_number} (${salesOrder.customer_name})`,
      customerId: customer.id,
      status: "ACTIVE",
      createdById: createdByUserId,
      description: `Automatically created from Zoho Books Sales Order #${salesOrder.salesorder_number}`
    },
    update: {
      status: "ACTIVE"
    }
  });

  // 3. Create Work Order
  const workOrderNumber = `WO-ZOHO-${salesOrder.salesorder_number}`;
  const existingWO = await prisma.workOrder.findUnique({ where: { workOrderNumber } });

  if (!existingWO) {
    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        projectId: project.id,
        customerId: customer.id,
        salesOrderNumber: salesOrder.salesorder_number,
        jobDescription: `Zoho Sales Order #${salesOrder.salesorder_number}`,
        status: "DRAFT",
        priority: "NORMAL",
        createdById: createdByUserId,
        items: {
          create: salesOrder.line_items.map((item) => ({
            itemCode: item.item_id || "ZOHO-ITEM",
            description: item.name + (item.description ? ` - ${item.description}` : ""),
            plannedQuantity: item.quantity,
            unit: item.unit || "Nos"
          }))
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        entityType: "WorkOrder",
        entityId: workOrder.id,
        workOrderId: workOrder.id,
        action: "CREATE",
        newValue: `Synced from Zoho Books SO #${salesOrder.salesorder_number}`
      }
    });

    return workOrder;
  }

  return existingWO;
}

/**
 * Creates a Draft Invoice in Zoho Books when a Dispatch is created in OPUS Steel.
 */
export async function createZohoInvoiceFromDispatch(dispatchId: string) {
  const token = await getZohoAccessToken();
  if (!token || !ZOHO_ORGANIZATION_ID) {
    console.log("[Zoho Integration] Skipping invoice push: Outbound Zoho API OAuth not configured.");
    return { success: false, reason: "Outbound Zoho API OAuth not configured" };
  }

  const dispatch = await prisma.dispatch.findUnique({
    where: { id: dispatchId },
    include: { workOrder: true, project: true, items: true }
  });

  if (!dispatch) return { success: false, reason: "Dispatch not found" };

  try {
    const invoicePayload = {
      customer_id: dispatch.customerId.replace("zoho-cust-", ""),
      date: new Date().toISOString().split("T")[0],
      reference_number: dispatch.dispatchNumber,
      notes: `Generated from OPUS Steel Dispatch ${dispatch.dispatchNumber} (Delivery Note: ${dispatch.deliveryNoteNumber || "N/A"})`,
      line_items: dispatch.items.map((item) => ({
        name: item.description,
        quantity: Number(item.quantityDispatched),
        rate: 0 // Commercial rate set in Zoho
      }))
    };

    const res = await fetch(`https://www.zohoapis.${ZOHO_DOMAIN}/books/v3/invoices?organization_id=${ZOHO_ORGANIZATION_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(invoicePayload)
    });

    const data = await res.json();
    return { success: data.code === 0, data };
  } catch (err) {
    console.error("[Zoho Invoice Creation Error]:", err);
    return { success: false, error: err };
  }
}
