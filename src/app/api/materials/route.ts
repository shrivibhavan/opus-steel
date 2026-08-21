import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertCan } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { z } from "zod";

const createMaterialSchema = z.object({
  materialName: z.string().min(1),
  materialType: z.string(),
  customTypeLabel: z.string().optional(),
  grade: z.string().optional(),
  size: z.string().optional(),
  thicknessMm: z.number().optional(),
  weightPerUnitKg: z.number().optional(),
  unit: z.string().default("KG"),
  notes: z.string().optional()
});

// Current stock per material, derived from the transaction ledger —
// stock is never written directly (rule #34 / #11).
export async function GET() {
  const materials = await prisma.material.findMany({
    include: { transactions: true, supplier: true },
    orderBy: { materialName: "asc" }
  });

  const withStock = materials.map((m) => {
    const stockKg = m.transactions.reduce((sum, t) => {
      const w = Number(t.weightKg ?? 0);
      if (t.txType === "RECEIPT" || t.txType === "RETURN") return sum + w;
      if (t.txType === "ISSUE" || t.txType === "SCRAP") return sum - w;
      return sum; // ADJUSTMENT handled case-by-case via signed weight
    }, 0);
    const { transactions, ...rest } = m;
    return { ...rest, stockKg };
  });

  return NextResponse.json(withStock);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    assertCan(user?.role as any, "MATERIAL_MANAGE");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const body = await req.json();
  const parsed = createMaterialSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const materialCode = await nextNumber("MAT");
  const material = await prisma.material.create({
    data: { materialCode, ...parsed.data, materialType: parsed.data.materialType as any }
  });

  return NextResponse.json(material, { status: 201 });
}
