import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertCan } from "@/lib/permissions";
import { z } from "zod";

const drawingSchema = z.object({
  drawingNumber: z.string().min(1),
  drawingTitle: z.string().min(1),
  projectId: z.string().uuid().optional(),
  workOrderId: z.string().uuid().optional(),
  documentType: z.string(),
  revision: z.string().default("00"),
  fileKey: z.string(), // set by the object-storage upload step
  fileName: z.string()
});

export async function GET() {
  const drawings = await prisma.drawing.findMany({
    include: { revisions: { orderBy: { revision: "desc" } }, project: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(drawings);
}

// New drawing number -> creates the parent Drawing + its first revision.
// Existing drawing number -> appends a new revision, never overwrites (rule #9).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    assertCan(user?.role as any, "DRAWING_UPLOAD");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const body = await req.json();
  const parsed = drawingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  let drawing = await prisma.drawing.findFirst({ where: { drawingNumber: d.drawingNumber } });
  if (!drawing) {
    drawing = await prisma.drawing.create({
      data: {
        drawingNumber: d.drawingNumber,
        drawingTitle: d.drawingTitle,
        projectId: d.projectId,
        workOrderId: d.workOrderId,
        documentType: d.documentType as any
      }
    });
  }

  const revision = await prisma.drawingRevision.create({
    data: {
      drawingId: drawing.id,
      revision: d.revision,
      fileKey: d.fileKey,
      fileName: d.fileName,
      uploadedById: user!.id
    }
  });

  return NextResponse.json({ drawing, revision }, { status: 201 });
}
