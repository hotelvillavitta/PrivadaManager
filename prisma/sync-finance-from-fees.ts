/**
 * Reconstruye ingresos de Tesorería a partir de cuotas/palapas reales en BD
 * (después de sync del concentrado Excel). Conserva gastos e ingresos manuales.
 *
 *   npx tsx prisma/sync-finance-from-fees.ts
 *   npx tsx prisma/sync-finance-from-fees.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import { FEE_CONCEPT, feeLabel } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");

  const [paidFees, palapas, gastos, manualIngresos] = await Promise.all([
    prisma.monthlyFee.findMany({
      where: { concept: FEE_CONCEPT.MANTENIMIENTO, status: "PAGADO" },
      select: {
        id: true,
        houseNumber: true,
        year: true,
        month: true,
        amount: true,
        paidAt: true,
        financeEntryId: true,
      },
    }),
    prisma.palapaPayment.findMany({
      select: {
        id: true,
        houseNumber: true,
        amount: true,
        paidAt: true,
        financeEntryId: true,
      },
    }),
    prisma.financeEntry.aggregate({
      where: { type: "GASTO", status: "APPROVED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financeEntry.findMany({
      where: {
        type: "INGRESO",
        status: "APPROVED",
        category: { notIn: ["Cuotas", "Palapa"] },
        monthlyFee: { is: null },
        palapaPayment: { is: null },
      },
      select: { id: true, amount: true, category: true, description: true },
    }),
  ]);

  const feesSum = paidFees.reduce((s, f) => s + f.amount, 0);
  const palapaSum = palapas.reduce((s, p) => s + p.amount, 0);
  const manualSum = manualIngresos.reduce((s, e) => s + e.amount, 0);
  const gastosSum = gastos._sum.amount ?? 0;

  console.log(`Cuotas PAGADO: ${paidFees.length} · $${feesSum}`);
  console.log(`Palapas: ${palapas.length} · $${palapaSum}`);
  console.log(`Ingresos manuales a conservar: ${manualIngresos.length} · $${manualSum}`);
  console.log(`Gastos a conservar: ${gastos._count._all} · $${gastosSum}`);
  console.log(
    `Liquidez esperada: $${feesSum + palapaSum + manualSum - gastosSum}`,
  );

  if (!apply) {
    console.log("\nEnsayo. Para escribir:");
    console.log("  npx tsx prisma/sync-finance-from-fees.ts --apply");
    return;
  }

  // Desligar y borrar ingresos de cuotas/palapa (incl. pendientes de cobros).
  await prisma.monthlyFee.updateMany({
    where: { financeEntryId: { not: null } },
    data: { financeEntryId: null },
  });
  await prisma.palapaPayment.updateMany({
    where: { financeEntryId: { not: null } },
    data: { financeEntryId: null },
  });

  const deleted = await prisma.financeEntry.deleteMany({
    where: {
      OR: [
        { category: { in: ["Cuotas", "Palapa"] } },
        { status: "PENDING", type: "INGRESO" },
      ],
    },
  });
  console.log(`Eliminados ingresos cuota/palapa/pending: ${deleted.count}`);

  let created = 0;
  const chunk = 80;
  for (let i = 0; i < paidFees.length; i += chunk) {
    const slice = paidFees.slice(i, i + chunk);
    await prisma.$transaction(
      slice.map((fee) =>
        prisma.financeEntry.create({
          data: {
            type: "INGRESO",
            category: "Cuotas",
            description: `Casa ${fee.houseNumber} · ${feeLabel(fee.year, fee.month)} · Mantenimiento`,
            amount: fee.amount,
            date: fee.paidAt ?? new Date(fee.year, fee.month - 1, 15),
            status: "APPROVED",
            approvedAt: fee.paidAt ?? new Date(fee.year, fee.month - 1, 15),
            monthlyFee: { connect: { id: fee.id } },
          },
        }),
      ),
    );
    created += slice.length;
    if (created % 400 === 0 || created === paidFees.length) {
      console.log(`  cuotas ${created}/${paidFees.length}`);
    }
  }

  for (const pay of palapas) {
    await prisma.financeEntry.create({
      data: {
        type: "INGRESO",
        category: "Palapa",
        description: `Casa ${pay.houseNumber} · Uso de palapa`,
        amount: pay.amount,
        date: pay.paidAt,
        status: "APPROVED",
        approvedAt: pay.paidAt,
        palapaPayment: { connect: { id: pay.id } },
      },
    });
  }
  console.log(`Palapas recreadas: ${palapas.length}`);

  const [ing, gas] = await Promise.all([
    prisma.financeEntry.aggregate({
      where: { type: "INGRESO", status: "APPROVED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financeEntry.aggregate({
      where: { type: "GASTO", status: "APPROVED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);
  const liq = (ing._sum.amount ?? 0) - (gas._sum.amount ?? 0);
  console.log(
    `\nListo. Ingresos $${ing._sum.amount} (${ing._count._all}) · Gastos $${gas._sum.amount ?? 0} (${gas._count._all}) · Liquidez $${liq}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
