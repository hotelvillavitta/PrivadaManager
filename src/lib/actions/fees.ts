"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { FEE_CONCEPT } from "@/lib/utils";
import { parseFeesWorkbook, type ParsedFeeRow } from "@/lib/fees/workbook";
import { getPaymentMatrix } from "@/lib/fees/matrix";
import { buildFeesWorkbookBuffer } from "@/lib/fees/workbook";

export type FeeImportPreviewItem = {
  houseNumber: string;
  year: number;
  month: number;
  action: "insert" | "update" | "unchanged";
  before: {
    status: string;
    amount: number;
    withSurcharge: boolean;
  } | null;
  after: {
    status: string;
    amount: number;
    withSurcharge: boolean;
    paidAt: string | null;
  };
};

export type FeeImportPreview = {
  total: number;
  insert: number;
  update: number;
  unchanged: number;
  warnings: string[];
  houses: number;
  periods: number;
  items: FeeImportPreviewItem[];
  /** Payload serializado para confirmar (solo fees a escribir). */
  applyPayload: string;
};

function serializeFee(fee: ParsedFeeRow) {
  return {
    houseNumber: fee.houseNumber,
    year: fee.year,
    month: fee.month,
    amount: fee.amount,
    status: fee.status,
    withSurcharge: fee.withSurcharge,
    paidAt: fee.paidAt ? fee.paidAt.toISOString() : null,
  };
}

export async function previewFeesImport(
  formData: FormData,
): Promise<{ error: string } | FeeImportPreview> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo Excel (.xlsx / .xls) o CSV." };
  }
  const name = file.name.toLowerCase();
  if (!/\.(xlsx|xls|csv)$/.test(name)) {
    return { error: "Formato no soportado. Usa .xlsx, .xls o .csv." };
  }
  if (file.size > 12 * 1024 * 1024) {
    return { error: "El archivo supera 12 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = parseFeesWorkbook(buffer);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "No se pudo leer el archivo de cuotas.",
    };
  }

  if (parsed.fees.length === 0) {
    return { error: "No se encontraron cuotas válidas en el archivo." };
  }

  const existing = await prisma.monthlyFee.findMany({
    where: {
      concept: FEE_CONCEPT.MANTENIMIENTO,
      OR: parsed.fees.map((f) => ({
        houseNumber: f.houseNumber,
        year: f.year,
        month: f.month,
      })),
    },
    select: {
      houseNumber: true,
      year: true,
      month: true,
      status: true,
      amount: true,
      withSurcharge: true,
      paidAt: true,
    },
  });

  const existingMap = new Map<
    string,
    {
      houseNumber: string;
      year: number;
      month: number;
      status: string;
      amount: number;
      withSurcharge: boolean;
      paidAt: Date | null;
    }
  >();
  for (const e of existing) {
    existingMap.set(`${e.houseNumber}|${e.year}|${e.month}`, e);
  }

  const items: FeeImportPreviewItem[] = [];
  const toApply: ReturnType<typeof serializeFee>[] = [];

  for (const fee of parsed.fees) {
    const key = `${fee.houseNumber}|${fee.year}|${fee.month}`;
    const prev = existingMap.get(key) ?? null;
    const after = {
      status: fee.status,
      amount: fee.amount,
      withSurcharge: fee.withSurcharge,
      paidAt: fee.paidAt ? fee.paidAt.toISOString() : null,
    };

    let action: FeeImportPreviewItem["action"] = "insert";
    if (prev) {
      const same =
        prev.status === fee.status &&
        Math.abs(prev.amount - fee.amount) < 0.01 &&
        Boolean(prev.withSurcharge) === Boolean(fee.withSurcharge);
      action = same ? "unchanged" : "update";
    }

    items.push({
      houseNumber: fee.houseNumber,
      year: fee.year,
      month: fee.month,
      action,
      before: prev
        ? {
            status: prev.status,
            amount: prev.amount,
            withSurcharge: prev.withSurcharge,
          }
        : null,
      after,
    });

    if (action !== "unchanged") {
      toApply.push(serializeFee(fee));
    }
  }

  const insert = items.filter((i) => i.action === "insert").length;
  const update = items.filter((i) => i.action === "update").length;
  const unchanged = items.filter((i) => i.action === "unchanged").length;

  return {
    total: items.length,
    insert,
    update,
    unchanged,
    warnings: parsed.warnings,
    houses: parsed.houses.length,
    periods: parsed.periods.length,
    // Limitar lista enviada al cliente para no saturar memoria.
    items: items.filter((i) => i.action !== "unchanged").slice(0, 200),
    applyPayload: JSON.stringify(toApply),
  };
}

export async function confirmFeesImport(
  applyPayload: string,
): Promise<{ error: string } | { ok: true; written: number }> {
  await requireAdmin();
  let rows: ReturnType<typeof serializeFee>[] = [];
  try {
    rows = JSON.parse(applyPayload) as ReturnType<typeof serializeFee>[];
  } catch {
    return { error: "Payload de importación inválido." };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No hay cambios para aplicar." };
  }
  if (rows.length > 20_000) {
    return { error: "Demasiados registros en una sola importación." };
  }

  let written = 0;
  const chunk = 100;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
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
            paidAt: fee.paidAt ? new Date(fee.paidAt) : null,
          },
          update: {
            amount: fee.amount,
            status: fee.status,
            withSurcharge: fee.withSurcharge,
            paidAt: fee.paidAt ? new Date(fee.paidAt) : null,
          },
        }),
      ),
    );
    written += slice.length;
  }

  revalidatePath("/admin/cobranza");
  revalidatePath("/admin/cobranza/matriz");
  revalidatePath("/admin/analiticos");
  revalidatePath("/cuotas");
  revalidatePath("/finanzas");
  revalidatePath("/admin/finanzas");

  return { ok: true, written };
}

/** Exporta concentrado actual como base64 XLSX (descarga en cliente). */
export async function exportFeesWorkbook(): Promise<
  { error: string } | { ok: true; filename: string; base64: string }
> {
  await requireAdmin();
  const matrix = await getPaymentMatrix();
  const buffer = buildFeesWorkbookBuffer({
    periods: matrix.periods,
    rows: matrix.rows.map((r) => ({
      houseNumber: r.houseNumber,
      cells: r.cells.map((c) => ({
        year: c.year,
        month: c.month,
        status: c.status,
        amount: c.amount,
        withSurcharge: c.withSurcharge,
      })),
    })),
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    filename: `concentrado-cuotas-grenache-${stamp}.xlsx`,
    base64: buffer.toString("base64"),
  };
}
