/**
 * Importa gastos desde el PDF exportado de Residex (Tesorería → Historial).
 *
 *   npx tsx prisma/import-gastos-pdf.ts
 *   npx tsx prisma/import-gastos-pdf.ts --apply
 *   GASTOS_PDF=/ruta/gastos.pdf npx tsx prisma/import-gastos-pdf.ts --apply
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
  };
};

const prisma = new PrismaClient();

const DEFAULT_PDF = "/Users/jcmac15/Downloads/gastos.pdf";

const KNOWN_CATEGORIES = [
  "Mantenimiento",
  "Reparación",
  "Seguridad",
  "Limpieza",
  "Internet",
  "historico",
  "Agua",
  "Luz",
  "Otro",
];

type ParsedGasto = {
  date: Date;
  description: string;
  category: string;
  amount: number;
};

function parseAmount(s: string) {
  return Number(String(s).replace(/[$,\s]/g, "").replace(/,/g, ""));
}

function parseDate(d: string) {
  const m = String(d).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
}

function splitCategory(rest: string): { description: string; category: string } {
  const trimmed = rest.trim();
  if (/historico$/i.test(trimmed)) {
    return {
      description: trimmed.replace(/\s*historico$/i, "").trim(),
      category: "Histórico",
    };
  }
  for (const cat of [...KNOWN_CATEGORIES].sort((a, b) => b.length - a.length)) {
    if (trimmed.endsWith(cat)) {
      return {
        description: trimmed.slice(0, -cat.length).trim(),
        category: cat === "historico" ? "Histórico" : cat,
      };
    }
  }
  return { description: trimmed, category: "Otro" };
}

export function parseGastosPdfText(text: string): ParsedGasto[] {
  const chunk = text.replace(/\r/g, "");
  const re =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+([\s\S]*?)(?=\d{1,2}\/\d{1,2}\/\d{4}\s+|Comunidad\s+residencial|-- \d+ of|$)/g;
  const entries: ParsedGasto[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk))) {
    const date = parseDate(m[1]);
    if (!date) continue;
    const body = m[2].replace(/\s+/g, " ").trim();
    const am = body.match(/\$([\d,]+\.\d{2})\s*$/);
    if (!am) continue;
    const amount = parseAmount(am[1]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const rest = body.slice(0, body.lastIndexOf("$")).trim();
    const { description, category } = splitCategory(rest);
    if (!description) continue;
    entries.push({ date, description, category, amount });
  }
  return entries;
}

/** Evita doble conteo del lump 2026 vs líneas detalladas del mismo año. */
function normalizeForImport(entries: ParsedGasto[]): ParsedGasto[] {
  const hist2026 = entries.find(
    (e) =>
      e.category === "Histórico" &&
      /egresos históricos anuales 2026/i.test(e.description),
  );
  const without2026Lump = entries.filter(
    (e) =>
      !(
        e.category === "Histórico" &&
        /egresos históricos anuales 2026/i.test(e.description)
      ),
  );
  const detail2026 = without2026Lump.filter(
    (e) => e.date.getFullYear() === 2026,
  );

  const out = [...without2026Lump];
  if (hist2026) {
    const detailSum = detail2026.reduce((s, e) => s + e.amount, 0);
    const residual = Math.round((hist2026.amount - detailSum) * 100) / 100;
    if (residual > 0.01) {
      out.push({
        date: new Date(2026, 3, 30, 12, 0, 0), // 30 abr 2026
        description:
          "Egresos 2026 previos al detalle (ene–abr, consolidado Residex)",
        category: "Histórico",
        amount: residual,
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function main() {
  const apply = process.argv.includes("--apply");
  const replace = process.argv.includes("--replace");
  const filePath = process.env.GASTOS_PDF ?? DEFAULT_PDF;
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  const raw = parseGastosPdfText(text);
  const entries = normalizeForImport(raw);

  const total = entries.reduce((s, e) => s + e.amount, 0);
  console.log(`Archivo: ${filePath}`);
  console.log(`Gastos parseados (raw): ${raw.length}`);
  console.log(`Gastos a importar: ${entries.length} · Total $${total.toFixed(2)}`);
  console.log(
    `  Históricos anuales: ${entries.filter((e) => e.category === "Histórico").length}`,
  );
  console.log(
    `  Detalle 2026: ${entries.filter((e) => e.date.getFullYear() === 2026 && e.category !== "Histórico").length}`,
  );

  if (!apply) {
    console.log("\nEnsayo. Para escribir:");
    console.log("  npx tsx prisma/import-gastos-pdf.ts --apply");
    console.log("  (opcional --replace: borra gastos actuales antes)");
    return;
  }

  if (replace) {
    const del = await prisma.financeEntry.deleteMany({
      where: { type: "GASTO" },
    });
    console.log(`Gastos eliminados: ${del.count}`);
  }

  let inserted = 0;
  let skipped = 0;
  for (const e of entries) {
    if (!replace) {
      const dayStart = new Date(
        e.date.getFullYear(),
        e.date.getMonth(),
        e.date.getDate(),
      );
      const dayEnd = new Date(
        e.date.getFullYear(),
        e.date.getMonth(),
        e.date.getDate() + 1,
      );
      const exists = await prisma.financeEntry.findFirst({
        where: {
          type: "GASTO",
          amount: e.amount,
          description: e.description,
          date: { gte: dayStart, lt: dayEnd },
        },
      });
      if (exists) {
        skipped += 1;
        continue;
      }
    }
    await prisma.financeEntry.create({
      data: {
        type: "GASTO",
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: e.date,
        status: "APPROVED",
        approvedAt: e.date,
      },
    });
    inserted += 1;
  }

  const gas = await prisma.financeEntry.aggregate({
    where: { type: "GASTO", status: "APPROVED" },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const ing = await prisma.financeEntry.aggregate({
    where: { type: "INGRESO", status: "APPROVED" },
    _sum: { amount: true },
  });
  const liq = (ing._sum.amount ?? 0) - (gas._sum.amount ?? 0);
  console.log(
    `\nInsertados: ${inserted} · omitidos (ya existían): ${skipped}`,
  );
  console.log(
    `Gastos totales: $${gas._sum.amount ?? 0} (${gas._count._all}) · Liquidez: $${liq}`,
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
