/**
 * Importa de PDFs Residex solo lo que aún no está en la DB:
 * - Multas ART.14 (pagadas como extraordinarias)
 * - Reparación de portón (ingreso Casa 6)
 * - Registro histórico de palapas 2021–mayo 2026 (lump General)
 *
 * Omite: cuotas lump, palapas individuales ya sincronizadas, cuotas del historial.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function d(y: number, m: number, day: number) {
  return new Date(y, m - 1, day, 12, 0, 0);
}

const ART14_EXCERPT =
  "Artículo 14.- El volumen de la música dentro de una residencia debe de ser moderado, sin ser invasivo para los demás residentes, respetando los horarios establecidos, sin que sobrepase las 02:00 am en los días acordados. Sanciones: Primera vez una multa de 2 UMAs… Toda multa económica debe ser pagada dentro de las primeras 24 hrs.";

const FINES = [
  {
    houseNumber: "3",
    amount: 235,
    paidAt: d(2026, 8, 3),
    notes: "1RA SANCION",
    cause: "Generar ruido excesivo que afecte a los vecinos.",
    billingYear: 2026,
    billingMonth: 8,
  },
  {
    houseNumber: "3",
    amount: 1175,
    paidAt: d(2026, 8, 3),
    notes: "2DA SANCION",
    cause: "Generar ruido excesivo que afecte a los vecinos.",
    billingYear: 2026,
    billingMonth: 8,
  },
  {
    houseNumber: "13",
    amount: 235,
    paidAt: d(2026, 7, 1),
    notes: "PRIMERA SANCION",
    cause: "Generar ruido excesivo que afecte a los vecinos.",
    billingYear: 2026,
    billingMonth: 7,
  },
] as const;

async function ensureFine(f: (typeof FINES)[number]) {
  const existing = await prisma.fine.findFirst({
    where: {
      houseNumber: f.houseNumber,
      amount: f.amount,
      notes: f.notes,
      status: "PAGADO",
    },
  });
  if (existing) {
    console.log("skip fine", f.houseNumber, f.amount, f.notes);
    return existing;
  }

  const entry = await prisma.financeEntry.create({
    data: {
      type: "INGRESO",
      category: "Multas",
      description: `Casa ${f.houseNumber} · MULTA ART.14 · ${f.notes}`,
      amount: f.amount,
      date: f.paidAt,
      status: "APPROVED",
      approvedAt: f.paidAt,
    },
  });

  const fine = await prisma.fine.create({
    data: {
      houseNumber: f.houseNumber,
      category: "Convivencia",
      cause: f.cause,
      causeId: "conv-ruido",
      regulationArticle: "Artículo 14",
      regulationExcerpt: ART14_EXCERPT,
      amount: f.amount,
      status: "PAGADO",
      notes: f.notes,
      billingYear: f.billingYear,
      billingMonth: f.billingMonth,
      issuedAt: f.paidAt,
      paidAt: f.paidAt,
      financeEntryId: entry.id,
    },
  });

  console.log("created fine", fine.id, f.houseNumber, f.amount, f.notes);
  return fine;
}

async function ensurePortonRepair() {
  const date = d(2026, 6, 1);
  const amount = 2100;
  const description =
    "Casa 6 · Reparacion de porton (Accidente Enero 2026) · Liquidación";

  const existing = await prisma.financeEntry.findFirst({
    where: {
      type: "INGRESO",
      amount,
      description: { contains: "Reparacion de porton" },
    },
  });
  if (existing) {
    console.log("skip porton repair", existing.id);
    return existing;
  }

  const entry = await prisma.financeEntry.create({
    data: {
      type: "INGRESO",
      category: "Extraordinarios",
      description,
      amount,
      date,
      status: "APPROVED",
      approvedAt: date,
    },
  });
  console.log("created porton repair", entry.id, amount);
  return entry;
}

async function ensureHistoricalPalapa() {
  const date = d(2026, 5, 8);
  const amount = 28750;
  const description =
    "Registro de cuotas de palapa 2021–mayo 2026 (lump Residex)";

  const existing = await prisma.financeEntry.findFirst({
    where: {
      type: "INGRESO",
      amount,
      OR: [
        { description: { contains: "2021" } },
        { description: { contains: "lump Residex" } },
        { description: { contains: "Registro de cuotas de palapa" } },
      ],
    },
  });
  if (existing) {
    console.log("skip historical palapa", existing.id);
    return existing;
  }

  const entry = await prisma.financeEntry.create({
    data: {
      type: "INGRESO",
      category: "Palapa",
      description,
      amount,
      date,
      status: "APPROVED",
      approvedAt: date,
    },
  });
  console.log("created historical palapa", entry.id, amount);
  return entry;
}

async function main() {
  console.log("=== Import missing from pagos extraordinarios / historial ===");

  for (const f of FINES) {
    await ensureFine(f);
  }
  await ensurePortonRepair();
  await ensureHistoricalPalapa();

  const [ingresos, gastos] = await Promise.all([
    prisma.financeEntry.aggregate({
      where: { type: "INGRESO", status: "APPROVED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financeEntry.aggregate({
      where: { type: "GASTO", status: "APPROVED" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const ing = ingresos._sum.amount ?? 0;
  const gas = gastos._sum.amount ?? 0;
  console.log("\n=== Totals ===");
  console.log("ingresos", ingresos._count, ing);
  console.log("gastos", gastos._count, gas);
  console.log("liquidez", ing - gas);

  const cats = await prisma.financeEntry.groupBy({
    by: ["category"],
    where: { type: "INGRESO", status: "APPROVED" },
    _sum: { amount: true },
    _count: true,
  });
  console.log("\ningreso by category:");
  for (const c of cats.sort(
    (a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0),
  )) {
    console.log(c.category, c._count, c._sum.amount);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
