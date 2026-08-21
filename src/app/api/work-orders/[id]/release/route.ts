import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertCan } from "@/lib/permissions";
import { sendWorkOrderReleasedEmail } from "@/lib/email";

// The single most important state transition in the system: the moment a
// work order becomes visible to the plant's active production queue.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  try {
    assertCan(user?.role as any, "WORK_ORDER_RELEASE");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const existing = await prisma.workOrder.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Only DRAFT work orders can be released (current status: ${existing.status})` },
      { status: 400 }
    );
  }

  const workOrder = await prisma.workOrder.update({
    where: { id: params.id },
    data: { status: "RELEASED", releasedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      userId: user!.id,
      entityType: "WorkOrder",
      entityId: workOrder.id,
      workOrderId: workOrder.id,
      action: "STATUS_CHANGE",
      fieldName: "status",
      oldValue: "DRAFT",
      newValue: "RELEASED"
    }
  });

  // Notify plant managers that a new job is ready for their queue.
  const plantManagers = await prisma.user.findMany({
    where: { role: "PLANT_MANAGER", active: true }
  });
  if (plantManagers.length > 0) {
    await prisma.notification.createMany({
      data: plantManagers.map((pm) => ({
        userId: pm.id,
        title: `Work order ${workOrder.workOrderNumber} released`,
        body: "New work order is ready for the plant.",
        link: `/plant/${workOrder.id}`
      }))
    });

    const project = await prisma.project.findUnique({ where: { id: workOrder.projectId } });
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    for (const pm of plantManagers) {
      if (pm.email) {
        sendWorkOrderReleasedEmail({
          workOrderNumber: workOrder.workOrderNumber,
          projectTitle: project?.name || "OPUS Project",
          recipientEmail: pm.email,
          recipientName: pm.name,
          link: `${appUrl}/plant/${workOrder.id}`
        }).catch((err) => console.error("Failed to send release email:", err));
      }
    }
  }

  return NextResponse.json(workOrder);
}
