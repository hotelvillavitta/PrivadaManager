import * as XLSX from "xlsx";
import {
  FEE_BASE_AMOUNT,
  FEE_CONCEPT,
  FEE_LATE_SURCHARGE,
  MONTH_LABELS,
  feeLabel,
  isFeePaymentLate,
  unpaidMaintenanceDueAmount,
} from "@/lib/utils";

const MONTH_CODES: Record<string, number> = {
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
};

export type ParsedFeeRow = {
  houseNumber: string;
  year: number;
  month: number;
  amount: number;
  status: "PAGADO" | "ADEUDO" | "PENDIENTE";
  withSurcharge: boolean;
  paidAt: Date | null;
  source: "matrix" | "detail";
};

export type ParsedPaymentDetail = {
  houseNumber: string;
  year: number | null;
  month: number | null;
  periodLabel: string;
  paidAt: Date | null;
  concept: string;
  withSurcharge: boolean;
  method: string | null;
  reference: string | null;
  amount: number;
  kind: "monthly" | "palapa" | "fine" | "other";
};

export type WorkbookParseResult = {
  fees: ParsedFeeRow[];
  details: ParsedPaymentDetail[];
  warnings: string[];
  periods: { year: number; month: number; label: string }[];
  houses: string[];
};

function parsePeriod(header: string): { year: number; month: number } | null {
  const raw = String(header ?? "").trim().toUpperCase();
  if (!raw) return null;
  const m = raw.match(/^([A-ZÁÉÍÓÚÑ]{3})(\d{2})$/i);
  if (!m) return null;
  const code = m[1]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 3)
    .toUpperCase();
  const month = MONTH_CODES[code];
  const yy = Number(m[2]);
  if (!month || Number.isNaN(yy)) return null;
  return { month, year: 2000 + yy };
}

export function normalizeHouse(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (value.toUpperCase() === "GENERAL" || value.toUpperCase() === "TOTAL") {
    return null;
  }
  if (value.toUpperCase() === "MA") return "1";
  if (/^\d+$/.test(value)) return String(Number(value));
  return value.toUpperCase();
}

function parseMatrixCell(
  houseNumber: string,
  year: number,
  month: number,
  cell: unknown,
): ParsedFeeRow | null {
  if (cell === null || cell === undefined) return null;
  const raw = String(cell).trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();

  // Pagado sin detalle (Residex usa "-")
  if (raw === "-" || upper === "—" || upper === "PAGADO SIN DETALLE") {
    return {
      houseNumber,
      year,
      month,
      amount: FEE_BASE_AMOUNT,
      status: "PAGADO",
      withSurcharge: false,
      paidAt: null,
      source: "matrix",
    };
  }

  if (upper === "PAGADO" || upper === "OK" || upper === "✓" || upper === "✔") {
    return {
      houseNumber,
      year,
      month,
      amount: FEE_BASE_AMOUNT,
      status: "PAGADO",
      withSurcharge: false,
      paidAt: new Date(year, month - 1, 10, 12, 0, 0),
      source: "matrix",
    };
  }

  const debtMatch = raw.match(/adeudo\s*\$?\s*([\d.,]+)/i);
  if (debtMatch) {
    const amount = Number(debtMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(amount)) return null;
    // Residex a veces deja "Adeudo $200" aunque ya pasó el día 10.
    // Normalizamos al monto exigible (base + recargo si aplica).
    const normalized = unpaidMaintenanceDueAmount({
      year,
      month,
      amount,
      status: "ADEUDO",
      withSurcharge: false,
    });
    return {
      houseNumber,
      year,
      month,
      amount: normalized,
      status: "ADEUDO",
      withSurcharge:
        isFeePaymentLate(year, month) &&
        normalized >= FEE_BASE_AMOUNT + FEE_LATE_SURCHARGE - 0.01,
      paidAt: null,
      source: "matrix",
    };
  }

  // Número suelto: en concentrados antiguos suele ser pagado con recargo.
  if (/^[\d.,]+$/.test(raw)) {
    const amount = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(amount)) return null;
    const withSurcharge = amount >= FEE_BASE_AMOUNT + FEE_LATE_SURCHARGE;
    return {
      houseNumber,
      year,
      month,
      amount,
      status: "PAGADO",
      withSurcharge,
      paidAt: new Date(year, month - 1, 10, 12, 0, 0),
      source: "matrix",
    };
  }

  return null;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d, 12, 0, 0);
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  // YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
  }
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12, 0, 0);
  }
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return new Date(t);
  return null;
}

function classifyDetail(periodLabel: string, concept: string): ParsedPaymentDetail["kind"] {
  const blob = `${periodLabel} ${concept}`.toLowerCase();
  if (blob.includes("palapa")) return "palapa";
  if (blob.includes("multa")) return "fine";
  if (concept.toLowerCase().includes("cuota mensual")) return "monthly";
  if (concept.toLowerCase().includes("cuota_extraordinaria")) return "other";
  return "other";
}

function readSheetRows(wb: XLSX.WorkBook, preferredNames: string[]) {
  const names = wb.SheetNames;
  const found =
    preferredNames.find((n) =>
      names.some((s) => s.toLowerCase() === n.toLowerCase()),
    ) ??
    preferredNames.find((n) =>
      names.some((s) => s.toLowerCase().includes(n.toLowerCase())),
    );
  if (!found) return null;
  const sheetName =
    names.find((s) => s.toLowerCase() === found.toLowerCase()) ??
    names.find((s) => s.toLowerCase().includes(found.toLowerCase()))!;
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
}

/** Parsea concentrado Residex / Grenache (matriz + detalle). */
export function parseFeesWorkbook(data: ArrayBuffer | Buffer): WorkbookParseResult {
  const wb = XLSX.read(data, { type: "buffer", cellDates: true });
  const warnings: string[] = [];
  const fees: ParsedFeeRow[] = [];
  const details: ParsedPaymentDetail[] = [];
  const houseSet = new Set<string>();

  const matrixRows =
    readSheetRows(wb, ["Cuotas por mes", "cuotas"]) ??
    (() => {
      // Fallback: primera hoja con encabezados tipo AGO21
      const first = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json<(string | number | null)[]>(first, {
        header: 1,
        defval: null,
        raw: true,
      });
    })();

  let periods: { year: number; month: number; label: string }[] = [];

  if (matrixRows && matrixRows.length >= 2) {
    const header = matrixRows[0].map((h) => String(h ?? "").trim());
    const casaIdx = header.findIndex((h) => /casa|#/i.test(h));
    const startIdx = casaIdx >= 0 ? casaIdx + 1 : 1;
    // Si hay columna de nombre (B), periodos empiezan en C (como import-grenache).
    const maybeName = header[startIdx];
    const periodStart =
      maybeName && !parsePeriod(maybeName) && casaIdx === 0 ? startIdx + 1 : startIdx;

    periods = header
      .slice(periodStart)
      .map((h) => {
        const p = parsePeriod(h);
        if (!p) return null;
        return { ...p, label: feeLabel(p.year, p.month) };
      })
      .filter((p): p is { year: number; month: number; label: string } => Boolean(p));

    if (periods.length === 0) {
      warnings.push("No se detectaron columnas de mes (AGO21, SEP21…).");
    }

    for (const row of matrixRows.slice(1)) {
      if (!row || row.every((c) => c === null || String(c).trim() === "")) continue;
      const houseNumber = normalizeHouse(row[casaIdx >= 0 ? casaIdx : 0]);
      if (!houseNumber) continue;
      houseSet.add(houseNumber);
      periods.forEach((period, i) => {
        const cell = row[periodStart + i];
        const parsed = parseMatrixCell(
          houseNumber,
          period.year,
          period.month,
          cell,
        );
        if (parsed) fees.push(parsed);
      });
    }
  } else {
    warnings.push("No se encontró la hoja de matriz de cuotas.");
  }

  const detailRows = readSheetRows(wb, ["Detalle de pagos", "detalle"]);
  if (detailRows && detailRows.length >= 2) {
    const header = detailRows[0].map((h) => String(h ?? "").trim().toLowerCase());
    const idx = {
      casa: header.findIndex((h) => h.includes("casa")),
      mes: header.findIndex((h) => h.includes("mes")),
      fecha: header.findIndex((h) => h.includes("fecha")),
      concepto: header.findIndex((h) => h.includes("concepto")),
      demora: header.findIndex((h) => h.includes("demora")),
      metodo: header.findIndex((h) => h.includes("método") || h.includes("metodo")),
      referencia: header.findIndex((h) => h.includes("referencia")),
      monto: header.findIndex((h) => h.includes("monto")),
    };

    for (const row of detailRows.slice(1)) {
      if (!row) continue;
      const casaRaw = idx.casa >= 0 ? row[idx.casa] : row[0];
      if (String(casaRaw ?? "").trim().toUpperCase() === "TOTAL") continue;
      const houseNumber = normalizeHouse(casaRaw);
      // Excluir agregados General (plan acordado).
      if (!houseNumber) continue;

      const periodLabel = String(
        idx.mes >= 0 ? row[idx.mes] ?? "" : "",
      ).trim();
      const concept = String(
        idx.concepto >= 0 ? row[idx.concepto] ?? "" : "",
      ).trim();
      const amount = Number(
        idx.monto >= 0 ? row[idx.monto] ?? 0 : 0,
      );
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const period = parsePeriod(periodLabel);
      const paidAt = parseDate(idx.fecha >= 0 ? row[idx.fecha] : null);
      const demoraRaw = String(
        idx.demora >= 0 ? row[idx.demora] ?? "" : "",
      ).toLowerCase();
      const withSurcharge =
        demoraRaw.includes("sí") ||
        demoraRaw.includes("si") ||
        demoraRaw.includes("con demora");
      const kind = classifyDetail(periodLabel, concept);

      details.push({
        houseNumber,
        year: period?.year ?? null,
        month: period?.month ?? null,
        periodLabel,
        paidAt,
        concept,
        withSurcharge,
        method:
          idx.metodo >= 0
            ? String(row[idx.metodo] ?? "").trim() || null
            : null,
        reference:
          idx.referencia >= 0
            ? String(row[idx.referencia] ?? "").trim() || null
            : null,
        amount,
        kind,
      });

      // Enriquecer cuota mensual cuando hay periodo válido.
      if (kind === "monthly" && period) {
        houseSet.add(houseNumber);
        fees.push({
          houseNumber,
          year: period.year,
          month: period.month,
          amount,
          status: "PAGADO",
          withSurcharge,
          paidAt,
          source: "detail",
        });
      }
    }
  }

  // Detalle gana sobre matriz para el mismo house/period (más preciso).
  const merged = new Map<string, ParsedFeeRow>();
  for (const fee of fees) {
    const key = `${fee.houseNumber}|${fee.year}|${fee.month}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, fee);
      continue;
    }
    if (fee.source === "detail" && prev.source !== "detail") {
      merged.set(key, fee);
      continue;
    }
    if (fee.source === prev.source) {
      // Preferir el que tenga paidAt / surcharge más explícito.
      if (fee.paidAt && !prev.paidAt) merged.set(key, fee);
      else if (fee.withSurcharge && !prev.withSurcharge) merged.set(key, fee);
    }
  }

  return {
    fees: [...merged.values()],
    details,
    warnings,
    periods,
    houses: [...houseSet].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
  };
}

export type ExportMatrixInput = {
  periods: { year: number; month: number; label: string }[];
  rows: {
    houseNumber: string;
    cells: {
      year: number;
      month: number;
      status: string;
      amount: number;
      withSurcharge: boolean;
    }[];
  }[];
};

/** Genera XLSX concentrado (matriz + resumen). */
export function buildFeesWorkbookBuffer(input: ExportMatrixInput): Buffer {
  const wb = XLSX.utils.book_new();

  const matrixAoA: (string | number)[][] = [
    ["Casa", ...input.periods.map((p) => p.label)],
  ];
  for (const row of input.rows) {
    const line: (string | number)[] = [row.houseNumber];
    for (const period of input.periods) {
      const cell = row.cells.find(
        (c) => c.year === period.year && c.month === period.month,
      );
      if (!cell || cell.status === "FUTURO" || cell.status === "SIN_REGISTRO") {
        line.push("");
      } else if (cell.status === "PAGADO") {
        line.push(cell.withSurcharge ? cell.amount : "PAGADO");
      } else {
        line.push(`Adeudo $${cell.amount}`);
      }
    }
    matrixAoA.push(line);
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(matrixAoA),
    "Cuotas por mes",
  );

  const houseSummary: (string | number)[][] = [
    [
      "Casa",
      "Meses pagados",
      "Meses con adeudo",
      "Adeudo total ($)",
      "Estatus",
    ],
  ];
  for (const row of input.rows) {
    let paid = 0;
    let unpaid = 0;
    let debt = 0;
    for (const c of row.cells) {
      if (c.status === "PAGADO") paid += 1;
      else if (
        c.status === "ADEUDO" ||
        c.status === "PENDIENTE" ||
        c.status === "SIN_REGISTRO"
      ) {
        unpaid += 1;
        debt += c.amount;
      }
    }
    houseSummary.push([
      row.houseNumber,
      paid,
      unpaid,
      debt,
      unpaid === 0 ? "Al corriente" : "Con adeudo",
    ]);
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(houseSummary),
    "Resumen por casa",
  );

  const monthSummary: (string | number)[][] = [
    ["Mes", "Casas pagadas", "Casas con adeudo", "Adeudo del mes ($)"],
  ];
  for (const period of input.periods) {
    let paid = 0;
    let unpaid = 0;
    let debt = 0;
    for (const row of input.rows) {
      const cell = row.cells.find(
        (c) => c.year === period.year && c.month === period.month,
      );
      if (!cell) continue;
      if (cell.status === "PAGADO") paid += 1;
      else if (
        cell.status === "ADEUDO" ||
        cell.status === "PENDIENTE" ||
        cell.status === "SIN_REGISTRO"
      ) {
        unpaid += 1;
        debt += cell.amount;
      }
    }
    monthSummary.push([period.label, paid, unpaid, debt]);
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(monthSummary),
    "Resumen por mes",
  );

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(out);
}

export function periodLabelFromParts(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]}${String(year).slice(-2)}`;
}

export { FEE_CONCEPT };
