import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function nextNumber(prefix: "PRJ" | "WO" | "PE" | "DWG" | "QC" | "DSP" | "MAT") {
  const year = new Date().getFullYear();
  const seq = await prisma.numberSequence.upsert({
    where: { prefix_year: { prefix, year } },
    create: { id: `${prefix}-${year}`, prefix, year, lastUsed: 1 },
    update: { lastUsed: { increment: 1 } }
  });
  return `${prefix}-${year}-${String(seq.lastUsed).padStart(5, "0")}`;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const [admin, office, plantManager, production, store, qc, dispatch, management] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@opussteel.ae" },
      create: { name: "Admin User", email: "admin@opussteel.ae", passwordHash, role: "ADMIN" },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "office@opussteel.ae" },
      create: { name: "Fatima Al Mansoori", email: "office@opussteel.ae", passwordHash, role: "OFFICE" },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "plantmanager@opussteel.ae" },
      create: { name: "Rakesh Nair", email: "plantmanager@opussteel.ae", passwordHash, role: "PLANT_MANAGER" },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "plant@opussteel.ae" },
      create: { name: "Suresh Kumar", email: "plant@opussteel.ae", passwordHash, role: "PRODUCTION" },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "store@opussteel.ae" },
      create: { name: "Ali Hassan", email: "store@opussteel.ae", passwordHash, role: "STORE" },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "qc@opussteel.ae" },
      create: { name: "Priya Menon", email: "qc@opussteel.ae", passwordHash, role: "QC" },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "dispatch@opussteel.ae" },
      create: { name: "Omar Farouk", email: "dispatch@opussteel.ae", passwordHash, role: "DISPATCH" },
      update: {}
    }),
    prisma.user.upsert({
      where: { email: "management@opussteel.ae" },
      create: { name: "Sara Al Rashid", email: "management@opussteel.ae", passwordHash, role: "MANAGEMENT" },
      update: {}
    })
  ]);

  // Processes
  const processNames = [
    ["MPR", "Material Preparation"],
    ["CUT", "Cutting"],
    ["DRL", "Drilling"],
    ["FIT", "Fit-up"],
    ["WLD", "Welding"],
    ["GRD", "Grinding"],
    ["ASM", "Assembly"],
    ["PNT", "Painting"],
    ["QC", "QC"],
    ["DSP", "Dispatch"]
  ];
  for (const [i, [code, name]] of processNames.entries()) {
    await prisma.process.upsert({
      where: { code },
      create: { code, name, sequence: i, department: "Production" },
      update: {}
    });
  }
  const weldingProcess = await prisma.process.findUniqueOrThrow({ where: { code: "WLD" } });

  // Customer
  const sobha = await prisma.customer.upsert({
    where: { id: "seed-customer-sobha" },
    create: {
      id: "seed-customer-sobha",
      name: "Sobha Advanced Manufacturing",
      contactPerson: "Procurement Team",
      email: "procurement@sobha.example",
      phone: "+971-4-000-0000",
      trn: "100000000000003"
    },
    update: {}
  });

  // Material master + opening stock receipt
  const plate = await prisma.material.upsert({
    where: { materialCode: "MAT-SEED-0001" },
    create: {
      materialCode: "MAT-SEED-0001",
      materialName: "MS Plate S355 10mm",
      materialType: "PLATE",
      grade: "S355",
      thicknessMm: 10,
      size: "1500 x 6000 mm",
      weightPerUnitKg: 706,
      unit: "KG"
    },
    update: {}
  });

  await prisma.materialTransaction.create({
    data: {
      materialId: plate.id,
      txType: "RECEIPT",
      quantity: 15,
      unit: "plates",
      weightKg: 10590, // 15 plates x 706 kg
      heatNumber: "H12345",
      storeLocation: "Yard A",
      performedById: store.id,
      remarks: "Opening stock receipt for Sobha Steel Fabrication"
    }
  });

  // Project
  const projectNumber = await nextNumber("PRJ");
  const project = await prisma.project.upsert({
    where: { projectNumber },
    create: {
      projectNumber,
      name: "Sobha Steel Fabrication",
      customerId: sobha.id,
      location: "Dubai Industrial City",
      projectManager: "Fatima Al Mansoori",
      status: "ACTIVE",
      startDate: new Date(),
      description: "Bracket assembly fabrication package for Sobha Advanced Manufacturing.",
      createdById: office.id
    },
    update: {}
  }).catch(async () =>
    prisma.project.findFirstOrThrow({ where: { name: "Sobha Steel Fabrication" } })
  );

  // Work order (DRAFT -> RELEASED) with a single item: Bracket Assembly x100
  const workOrderNumber = await nextNumber("WO");
  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderNumber,
      projectId: project.id,
      customerId: sobha.id,
      jobDescription: "Bracket Assembly fabrication",
      priority: "NORMAL",
      status: "DRAFT",
      createdById: office.id,
      items: {
        create: [
          {
            itemCode: "BRK-100",
            description: "Bracket Assembly",
            drawingNumber: "DWG-BRK-100",
            drawingRevision: "01",
            plannedQuantity: 100,
            unit: "Nos",
            plannedWeightKg: 10000
          }
        ]
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: office.id,
      entityType: "WorkOrder",
      entityId: workOrder.id,
      workOrderId: workOrder.id,
      action: "CREATE",
      newValue: `${workOrder.workOrderNumber} (DRAFT)`
    }
  });

  // Office releases the work order — this is the moment it becomes visible
  // to the plant, per the platform's most important business rule.
  const released = await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: { status: "RELEASED", releasedAt: new Date() }
  });
  await prisma.auditLog.create({
    data: {
      userId: office.id,
      entityType: "WorkOrder",
      entityId: released.id,
      workOrderId: released.id,
      action: "STATUS_CHANGE",
      fieldName: "status",
      oldValue: "DRAFT",
      newValue: "RELEASED"
    }
  });
  await prisma.notification.create({
    data: {
      userId: plantManager.id,
      title: `Work order ${released.workOrderNumber} released`,
      body: "New work order is ready for the plant.",
      link: `/plant/${released.id}`
    }
  });

  // Store issues steel to the work order.
  await prisma.materialTransaction.create({
    data: {
      materialId: plate.id,
      projectId: project.id,
      workOrderId: released.id,
      txType: "ISSUE",
      quantity: 15,
      unit: "plates",
      weightKg: 10500,
      storeLocation: "Yard A",
      performedById: store.id,
      remarks: "Issued for WO bracket assembly run"
    }
  });
  await prisma.workOrder.update({ where: { id: released.id }, data: { status: "READY_FOR_PRODUCTION" } });

  // Two production entries -> 50/100 completed, matching the spec's demo.
  const entry1Number = await nextNumber("PE");
  await prisma.productionEntry.create({
    data: {
      entryNumber: entry1Number,
      workOrderId: released.id,
      projectId: project.id,
      processId: weldingProcess.id,
      shift: "Day",
      operator: "Suresh Kumar",
      completedQuantity: 25,
      steelUsedKg: 2400,
      scrapKg: 100,
      createdById: production.id
    }
  });
  const entry2Number = await nextNumber("PE");
  await prisma.productionEntry.create({
    data: {
      entryNumber: entry2Number,
      workOrderId: released.id,
      projectId: project.id,
      processId: weldingProcess.id,
      shift: "Day",
      operator: "Suresh Kumar",
      completedQuantity: 25,
      steelUsedKg: 2300,
      scrapKg: 80,
      createdById: production.id
    }
  });
  await prisma.workOrder.update({ where: { id: released.id }, data: { status: "PARTIALLY_COMPLETED" } });

  // QC inspects the 50 completed units: 48 pass, 2 fail -> rework.
  const qcNumber = await nextNumber("QC");
  await prisma.qcInspection.create({
    data: {
      inspectionNumber: qcNumber,
      projectId: project.id,
      workOrderId: released.id,
      inspectorId: qc.id,
      inspectionType: "Final visual + dimensional",
      result: "CONDITIONAL",
      quantityInspected: 50,
      quantityPassed: 48,
      quantityFailed: 2,
      reworkRequired: true,
      comments: "2 units failed weld inspection — routed to rework.",
      defects: {
        create: [{ description: "Weld porosity on bracket flange", quantity: 2 }]
      }
    }
  });
  await prisma.workOrder.update({ where: { id: released.id }, data: { status: "QC_PASSED" } });

  // Dispatch the 48 QC-passed units.
  const dspNumber = await nextNumber("DSP");
  await prisma.dispatch.create({
    data: {
      dispatchNumber: dspNumber,
      projectId: project.id,
      workOrderId: released.id,
      customerId: sobha.id,
      vehicleNumber: "DXB-A-12345",
      driverName: "Mohammed Iqbal",
      quantity: 48,
      weightKg: 4800,
      deliveryNoteNumber: "DN-0001",
      recordedById: dispatch.id,
      items: {
        create: [{ description: "Bracket Assembly", quantityDispatched: 48 }]
      }
    }
  });
  await prisma.workOrder.update({ where: { id: released.id }, data: { status: "READY_FOR_DISPATCH" } });

  console.log("Seed complete.");
  console.log("Demo login: office@opussteel.ae / plant@opussteel.ae / admin@opussteel.ae (password: demo1234)");
  console.log(`Project: ${project.projectNumber} — Work Order: ${released.workOrderNumber}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
