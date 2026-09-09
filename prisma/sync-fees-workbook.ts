/**
 * Upsert de cuotas desde concentrado Excel (sin borrar historial ni usuarios).
 *
 * Uso:
 *   npx tsx prisma/sync-fees-workbook.ts
 *   npx tsx prisma/sync-fees-workbook.ts --apply
 *   GRENACHE_FEES_XLSX=/ruta/archivo.xlsx npx tsx prisma/sync-fees-workbook.ts --apply
 */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { parseFeesWorkbook } from "../src/lib/fees/workbook";
import { FEE_CONCEPT } from "../src/lib/utils";

const prisma = new PrismaClient();

const DEFAULT_XLSX =
  "/Users/jcmac15/Downloads/concentrado-cuotas-grenach--2026-09-09.xlsx";

async function main() {
  const apply = process.argv.includes("--apply");
  const filePath = process.env.GRENACHE_FEES_XLSX ?? DEFAULT_XLSX;
  const buffer = await readFile(filePath);
  const parsed = parseFeesWorkbook(buffer);

  console.log(`Archivo: ${filePath}`);
  console.log(`Casas: ${parsed.houses.length}`);
  console.log(`Periodos matriz: ${parsed.periods.length}`);
  console.log(`Cuotas parseadas: ${parsed.fees.length}`);
  console.log(`Detalles individuales (no General): ${parsed.details.length}`);
  if (parsed.warnings.length) {
    console.log("Advertencias:");
    for (const w of parsed.warnings) console.log(`  - ${w}`);
  }

  const paid = parsed.fees.filter((f) => f.status === "PAGADO").length;
  const debt = parsed.fees.filter((f) => f.status !== "PAGADO").length;
  const sep26 = parsed.fees.filter((f) => f.year === 2026 && f.month === 9);
  console.log(`Pagadas: ${paid} · Adeudo/pendiente: ${debt}`);
  console.log(
    `SEP26: ${sep26.length} celdas · adeudo ${sep26.filter((f) => f.status !== "PAGADO").length}`,
  );

  if (!apply) {
    console.log("\nEnsayo solamente. Para escribir:");
    console.log("  npx tsx prisma/sync-fees-workbook.ts --apply");
    return;
  }

  let written = 0;
  const chunk = 100;
  for (let i = 0; i < parsed.fees.length; i += chunk) {
    const slice = parsed.fees.slice(i, i + chunk);
    await prisma.$transaction(
      slice.map((fee) =>
        prisma.monthlyFee.upsert({
          where: {
            houseNumber_year_month_concept: {
              houseNumber: fee.houseNumber,
              year: fee.year,
              month: fee.month,
              concept: FEE_CONCEPT.MANTENIMIENTO,
            },
          },
          create: {
            houseNumber: fee.houseNumber,
            year: fee.year,
            month: fee.month,
            concept: FEE_CONCEPT.MANTENIMIENTO,
            amount: fee.amount,
            status: fee.status,
            withSurcharge: fee.withSurcharge,
            paidAt: fee.paidAt,
          },
          update: {
            amount: fee.amount,
            status: fee.status,
            withSurcharge: fee.withSurcharge,
            paidAt: fee.paidAt,
          },
        }),
      ),
    );
    written += slice.length;
    console.log(`  upsert ${written} / ${parsed.fees.length}`);
  }

  // Palapas y multas identificables del detalle (solo informativo / create si aplica).
  const palapas = parsed.details.filter((d) => d.kind === "palapa");
  for (const p of palapas) {
    if (!p.paidAt) continue;
    const exists = await prisma.palapaPayment.findFirst({
      where: {
        houseNumber: p.houseNumber,
        amount: p.amount,
        paidAt: p.paidAt,
      },
    });
    if (exists) continue;
    await prisma.palapaPayment.create({
      data: {
        houseNumber: p.houseNumber,
        amount: p.amount,
        paidAt: p.paidAt,
      },
    });
  }
  console.log(`Palapas revisadas: ${palapas.length}`);

  console.log("\nListo. Cuotas sincronizadas con upsert (sin borrar historial).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
