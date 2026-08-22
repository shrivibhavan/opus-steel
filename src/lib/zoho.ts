import { prisma } from "./prisma";

// Zoho API Credentials from Environment Variables
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "";
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "";
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || "";
const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID || "";
const ZOHO_DOMAIN = process.env.ZOHO_DOMAIN || "com";

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
 * Helper to make authenticated GET requests to Zoho Books API.
 */
async function zohoApiFetch(token: string, endpoint: string) {
  const url = `https://www.zohoapis.${ZOHO_DOMAIN}/books/v3/${endpoint}${endpoint.includes("?") ? "&" : "?"}organization_id=${ZOHO_ORGANIZATION_ID}&per_page=200`;
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  return res.json();
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
    connected: true,
    inboundActive: true,
    outboundActive: hasFullConfig,
    organizationId: ZOHO_ORGANIZATION_ID || "Optional (Needed for automatic invoice generation)",
    clientId: ZOHO_CLIENT_ID ? `${ZOHO_CLIENT_ID.substring(0, 10)}...` : "Not Set",
    statusText,
    webhookUrl: `${process.env.NEXTAUTH_URL || "https://app.opusengg.com"}/api/integrations/zoho/webhook`
  };
}

// =========================================================
// SYNC: Customers from Zoho Books → OPUS Steel
// =========================================================

/**
 * Pulls all contacts (customers) from Zoho Books and upserts into OPUS Steel.
 */
export async function syncZohoCustomers(token: string) {
  const data = await zohoApiFetch(token, "contacts");

  if (!data.contacts || !Array.isArray(data.contacts)) {
    console.log("[Zoho Sync] No contacts found or API error:", data.message);
    return { synced: 0, customers: [] };
  }

  const synced: string[] = [];

  for (const contact of data.contacts) {
    if (contact.status !== "active") continue;

    const zohoId = `zoho-cust-${contact.contact_id}`;
    await prisma.customer.upsert({
      where: { id: zohoId },
      create: {
        id: zohoId,
        name: contact.contact_name || contact.company_name || "Zoho Contact",
        contactPerson: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null,
        email: contact.email || null,
        phone: contact.phone || contact.mobile || null,
        notes: `Synced from Zoho Books (Contact ID: ${contact.contact_id})`
      },
      update: {
        name: contact.contact_name || contact.company_name,
        contactPerson: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || undefined,
        email: contact.email || undefined,
        phone: contact.phone || contact.mobile || undefined
      }
    });
    synced.push(contact.contact_name);
  }

  return { synced: synced.length, customers: synced };
}

// =========================================================
// SYNC: Documents & Drawings from Zoho Books → OPUS Steel
// =========================================================

/**
 * Pulls attached documents (drawings, PDFs, specs) for a Zoho Books record
 * and registers them as Drawings and Attachments in OPUS Steel.
 */
export async function syncZohoEntityDocuments(
  token: string,
  entity: string,
  entityId: string,
  projectId?: string,
  workOrderId?: string,
  createdByUserId?: string
) {
  try {
    const data = await zohoApiFetch(token, `${entity}/${entityId}/documents`);
    const docs = data.documents || data.document_files || [];
    if (!Array.isArray(docs) || docs.length === 0) return 0;

    let count = 0;
    for (const doc of docs) {
      const docId = doc.document_id || doc.id;
      const fileName = doc.file_name || doc.name || "Zoho_Attachment.pdf";
      const drawingNumber = `DWG-ZOHO-${docId}`;
      const fileKey = `/api/integrations/zoho/document?entity=${entity}&entityId=${entityId}&docId=${docId}`;

      const drawing = await prisma.drawing.upsert({
        where: { id: `zoho-doc-${docId}` },
        create: {
          id: `zoho-doc-${docId}`,
          drawingNumber,
          drawingTitle: fileName,
          projectId,
          workOrderId,
          documentType: "SHOP_DRAWING",
          remarks: `Synced from Zoho Books (${entity})`
        },
        update: {
          drawingTitle: fileName,
          projectId,
          workOrderId
        }
      });

      await prisma.drawingRevision.upsert({
        where: { drawingId_revision: { drawingId: drawing.id, revision: "00" } },
        create: {
          drawingId: drawing.id,
          revision: "00",
          status: "ISSUED",
          fileKey,
          fileName,
          uploadedById: createdByUserId || "seed-admin",
          remarks: "Synced from Zoho Books attachment"
        },
        update: {
          fileKey,
          fileName
        }
      });

      await prisma.attachment.upsert({
        where: { id: `zoho-att-${docId}` },
        create: {
          id: `zoho-att-${docId}`,
          fileKey,
          fileName,
          mimeType: doc.file_type || "application/pdf",
          sizeBytes: doc.file_size ? Number(doc.file_size) : null,
          projectId,
          workOrderId
        },
        update: {
          fileKey,
          fileName
        }
      });

      count++;
    }
    return count;
  } catch (err) {
    return 0;
  }
}

// =========================================================
// SYNC: Projects from Zoho Books → OPUS Steel
// =========================================================

/**
 * Pulls all projects from Zoho Books and upserts into OPUS Steel.
 */
export async function syncZohoProjects(token: string, createdByUserId: string) {
  const data = await zohoApiFetch(token, "projects");

  if (!data.projects || !Array.isArray(data.projects)) {
    console.log("[Zoho Sync] No projects found or API error:", data.message);
    return { synced: 0, projects: [] };
  }

  const synced: string[] = [];

  for (const proj of data.projects) {
    // Upsert customer first
    const customerId = `zoho-cust-${proj.customer_id}`;
    await prisma.customer.upsert({
      where: { id: customerId },
      create: {
        id: customerId,
        name: proj.customer_name || "Zoho Client",
        notes: `Synced from Zoho Books (Customer ID: ${proj.customer_id})`
      },
      update: {
        name: proj.customer_name || undefined
      }
    });

    // Use Zoho project code if available, otherwise use project_id
    const projectCode = proj.project_code || proj.project_id;
    const projectNumber = `PRJ-ZOHO-${projectCode}`;

    const project = await prisma.project.upsert({
      where: { projectNumber },
      create: {
        projectNumber,
        name: proj.project_name,
        customerId,
        status: proj.status === "active" ? "ACTIVE" : "COMPLETED",
        createdById: createdByUserId,
        description: proj.description || `Synced from Zoho Books (Project ID: ${proj.project_id})${proj.rate ? ` | Value: AED ${Number(proj.rate).toLocaleString()}` : ""}`
      },
      update: {
        name: proj.project_name,
        customerId,
        status: proj.status === "active" ? "ACTIVE" : "COMPLETED",
        description: proj.description || `Synced from Zoho Books (Project ID: ${proj.project_id})${proj.rate ? ` | Value: AED ${Number(proj.rate).toLocaleString()}` : ""}`
      }
    });

    // Sync attached drawings & documents for this project
    await syncZohoEntityDocuments(token, "projects", proj.project_id, project.id, undefined, createdByUserId);

    synced.push(proj.project_name);
  }

  return { synced: synced.length, projects: synced };
}

// =========================================================
// SYNC: Invoices from Zoho Books → OPUS Steel
// =========================================================

/**
 * Pulls invoices from Zoho Books and creates project records.
 */
export async function syncZohoInvoices(token: string, createdByUserId: string) {
  const data = await zohoApiFetch(token, "invoices");

  if (!data.invoices || !Array.isArray(data.invoices)) {
    return { synced: 0, invoices: [] };
  }

  const synced: string[] = [];

  for (const inv of data.invoices) {
    const customerId = `zoho-cust-${inv.customer_id}`;
    await prisma.customer.upsert({
      where: { id: customerId },
      create: {
        id: customerId,
        name: inv.customer_name || "Zoho Customer",
        notes: `Synced from Zoho Books Invoice`
      },
      update: {
        name: inv.customer_name || undefined
      }
    });

    const projectNumber = `PRJ-ZOHO-INV-${inv.invoice_number}`;
    const existingProject = await prisma.project.findUnique({ where: { projectNumber } });

    if (!existingProject) {
      await prisma.project.create({
        data: {
          projectNumber,
          name: `Invoice ${inv.invoice_number} — ${inv.customer_name}`,
          customerId,
          status: inv.status === "paid" ? "COMPLETED" : "ACTIVE",
          createdById: createdByUserId,
          description: `Synced from Zoho Books Invoice #${inv.invoice_number} | Total: AED ${Number(inv.total || 0).toLocaleString()} | Status: ${inv.status}`
        }
      });
    }

    synced.push(inv.invoice_number);
  }

  return { synced: synced.length, invoices: synced };
}

// =========================================================
// SYNC: Estimates (Quotations) from Zoho Books → OPUS Steel
// =========================================================

/**
 * Pulls estimates/quotations from Zoho Books and creates project records.
 */
export async function syncZohoEstimates(token: string, createdByUserId: string) {
  const data = await zohoApiFetch(token, "estimates");

  if (!data.estimates || !Array.isArray(data.estimates)) {
    return { synced: 0, estimates: [] };
  }

  const synced: string[] = [];

  for (const est of data.estimates) {
    const customerId = `zoho-cust-${est.customer_id}`;
    await prisma.customer.upsert({
      where: { id: customerId },
      create: {
        id: customerId,
        name: est.customer_name || "Zoho Customer",
        notes: `Synced from Zoho Books Estimate`
      },
      update: {
        name: est.customer_name || undefined
      }
    });

    const projectNumber = `PRJ-ZOHO-QT-${est.estimate_number}`;
    const existingProject = await prisma.project.findUnique({ where: { projectNumber } });

    if (!existingProject) {
      const status = est.status === "accepted" ? "ACTIVE" : "PLANNING";
      await prisma.project.create({
        data: {
          projectNumber,
          name: `Quote ${est.estimate_number} — ${est.customer_name}`,
          customerId,
          status,
          createdById: createdByUserId,
          description: `Synced from Zoho Books Quotation #${est.estimate_number} | Total: AED ${Number(est.total || 0).toLocaleString()} | Status: ${est.status}`
        }
      });
    }

    synced.push(est.estimate_number);
  }

  return { synced: synced.length, estimates: synced };
}

// =========================================================
// SYNC: Sales Orders from Zoho Books → OPUS Steel
// =========================================================

/**
 * Pulls sales orders from Zoho Books and creates Work Orders.
 */
export async function syncZohoSalesOrders(token: string, createdByUserId: string) {
  const data = await zohoApiFetch(token, "salesorders");

  if (!data.salesorders || !Array.isArray(data.salesorders)) {
    return { synced: 0, salesOrders: [] };
  }

  const synced: string[] = [];

  for (const so of data.salesorders) {
    let lineItems = so.line_items || [];
    if (!lineItems.length) {
      try {
        const detail = await zohoApiFetch(token, `salesorders/${so.salesorder_id}`);
        lineItems = detail.salesorder?.line_items || [];
      } catch (e) {
        console.warn("[Zoho Sync] Could not fetch SO details:", so.salesorder_id);
      }
    }

    const wo = await processZohoSalesOrder(
      {
        salesorder_id: so.salesorder_id,
        salesorder_number: so.salesorder_number,
        customer_id: so.customer_id,
        customer_name: so.customer_name,
        date: so.date,
        total: Number(so.total || 0),
        line_items: lineItems.map((item: any) => ({
          item_id: item.item_id || "ITEM",
          name: item.name || "Steel Fabrication Item",
          description: item.description || "",
          quantity: Number(item.quantity || 1),
          rate: Number(item.rate || 0),
          unit: item.unit || "Nos"
        }))
      },
      createdByUserId
    );

    if (wo && wo.id) {
      await syncZohoEntityDocuments(token, "salesorders", so.salesorder_id, wo.projectId, wo.id, createdByUserId);
    }

    synced.push(so.salesorder_number);
  }

  return { synced: synced.length, salesOrders: synced };
}

// =========================================================
// MASTER SYNC: Pull everything from Zoho Books
// =========================================================

/**
 * Runs a full sync of all entities from Zoho Books into OPUS Steel.
 * Customers → Projects → Sales Orders → Invoices → Estimates
 */
export async function syncAllFromZoho(createdByUserId?: string) {
  const token = await getZohoAccessToken();
  if (!token) {
    return { success: false, error: "Could not get Zoho access token. Check credentials." };
  }

  // Resolve a valid user ID for foreign key references
  if (!createdByUserId) {
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const anyUser = adminUser || await prisma.user.findFirst();
    if (!anyUser) {
      return { success: false, error: "No users found in database. Run prisma db seed first." };
    }
    createdByUserId = anyUser.id;
  }

  console.log("[Zoho Full Sync] Starting...");

  const customers = await syncZohoCustomers(token);
  console.log(`[Zoho Full Sync] Customers: ${customers.synced}`);

  const projects = await syncZohoProjects(token, createdByUserId);
  console.log(`[Zoho Full Sync] Projects: ${projects.synced}`);

  const salesOrders = await syncZohoSalesOrders(token, createdByUserId);
  console.log(`[Zoho Full Sync] Sales Orders: ${salesOrders.synced}`);

  const invoices = await syncZohoInvoices(token, createdByUserId);
  console.log(`[Zoho Full Sync] Invoices: ${invoices.synced}`);

  const estimates = await syncZohoEstimates(token, createdByUserId);
  console.log(`[Zoho Full Sync] Estimates: ${estimates.synced}`);

  console.log("[Zoho Full Sync] Complete!");

  return {
    success: true,
    summary: {
      customers: customers.synced,
      projects: projects.synced,
      salesOrders: salesOrders.synced,
      invoices: invoices.synced,
      estimates: estimates.synced,
      total: customers.synced + projects.synced + salesOrders.synced + invoices.synced + estimates.synced
    },
    details: {
      customers: customers.customers,
      projects: projects.projects,
      salesOrders: salesOrders.salesOrders,
      invoices: invoices.invoices,
      estimates: estimates.estimates
    }
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
 * Maps a Zoho Project directly into an OPUS Steel Project.
 */
export async function processZohoDirectProject(
  projectData: { project_id?: string; project_name: string; customer_name?: string },
  createdByUserId: string
) {
  const customerName = projectData.customer_name || "Zoho Books Client";
  const customerId = `zoho-cust-${customerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  const customer = await prisma.customer.upsert({
    where: { id: customerId },
    create: {
      id: customerId,
      name: customerName,
      notes: "Synced from Zoho Books Project Creation"
    },
    update: { name: customerName }
  });

  const projectNumber = `PRJ-ZOHO-${projectData.project_id || Date.now().toString().slice(-6)}`;
  return await prisma.project.upsert({
    where: { projectNumber },
    create: {
      projectNumber,
      name: projectData.project_name,
      customerId: customer.id,
      status: "ACTIVE",
      createdById: createdByUserId,
      description: "Directly synced from Zoho Books Project Creation"
    },
    update: {
      name: projectData.project_name,
      status: "ACTIVE"
    }
  });
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
        rate: 0
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
