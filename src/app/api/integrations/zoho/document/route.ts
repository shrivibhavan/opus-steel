import { NextRequest, NextResponse } from "next/server";
import { getZohoAccessToken } from "@/lib/zoho";

export const dynamic = "force-dynamic";

/**
 * Proxy route to download or view a document/drawing attached to a Zoho Books record.
 * URL: /api/integrations/zoho/document?entity=salesorders&entityId=xxx&docId=yyy
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") || "salesorders";
  const entityId = searchParams.get("entityId");
  const docId = searchParams.get("docId");

  if (!entityId || !docId) {
    return NextResponse.json({ error: "Missing entityId or docId parameter" }, { status: 400 });
  }

  const token = await getZohoAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Zoho API token unavailable" }, { status: 401 });
  }

  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  const domain = process.env.ZOHO_DOMAIN || "com";
  const zohoUrl = `https://www.zohoapis.${domain}/books/v3/${entity}/${entityId}/documents/${docId}?organization_id=${orgId}`;

  try {
    const res = await fetch(zohoUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch document from Zoho Books" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": res.headers.get("content-disposition") || `inline; filename="drawing-${docId}"`
      }
    });
  } catch (err: any) {
    console.error("[Zoho Document Proxy Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve document" }, { status: 500 });
  }
}
