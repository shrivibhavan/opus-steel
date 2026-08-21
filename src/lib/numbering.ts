import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

// Generates human-readable sequential numbers like WO-2026-00001, atomically,
// independent of the internal UUID primary key.
export async function nextNumber(
  prefix: "PRJ" | "WO" | "PE" | "DWG" | "QC" | "DSP" | "MAT",
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx ?? prisma;
  const year = new Date().getFullYear();

  const seq = await db.numberSequence.upsert({
    where: { prefix_year: { prefix, year } },
    create: { id: `${prefix}-${year}`, prefix, year, lastUsed: 1 },
    update: { lastUsed: { increment: 1 } }
  });

  return `${prefix}-${year}-${String(seq.lastUsed).padStart(5, "0")}`;
}
