import "server-only";

import { prisma } from "@/lib/db";
import {
  FEE_BASE_AMOUNT,
  FEE_CONCEPT,
  calendarPartsInTijuana,
  feeLabel,
} from "@/lib/utils";

export type MatrixCellStatus =
  | "PAGADO"
  | "ADEUDO"
  | "PENDIENTE"
  | "SIN_REGISTRO"
  | "FUTURO";

export type PaymentMatrixCell = {
  year: number;
  month: number;
  label: string;
  status: MatrixCellStatus;
  amount: number;
  withSurcharge: boolean;
  paidAt: string | null;
  feeId: string | null;
};

export type PaymentMatrixRow = {
  houseNumber: string;
  residents: string[];
  cells: PaymentMatrixCell[];
  unpaidCount: number;
  unpaidAmount: number;
};

export type PaymentMatrixPeriod = {
  year: number;
  month: number;
  label: string;
  key: number;
};

export type PaymentMatrix = {
  periods: PaymentMatrixPeriod[];
  rows: PaymentMatrixRow[];
  rangeLabel: string;
};

function periodKey(year: number, month: number) {
  return year * 12 + month;
}

function sortHouse(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, "es");
}

function buildPeriods(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number,
): PaymentMatrixPeriod[] {
  const out: PaymentMatrixPeriod[] = [];
  let y = fromYear;
  let m = fromMonth;
  while (periodKey(y, m) <= periodKey(toYear, toMonth)) {
    out.push({
      year: y,
      month: m,
      label: feeLabel(y, m),
      key: periodKey(y, m),
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Matriz casa × mes para administración de cobranza. */
export async function getPaymentMatrix(opts?: {
  fromYear?: number;
  fromMonth?: number;
  toYear?: number;
  toMonth?: number;
}): Promise<PaymentMatrix> {
  const now = calendarPartsInTijuana();
  const [feeBounds, housesWithResidents, feeHouses] = await Promise.all([
    prisma.monthlyFee.aggregate({
      where: { concept: FEE_CONCEPT.MANTENIMIENTO },
      _min: { year: true, month: true },
      _max: { year: true, month: true },
    }),
    prisma.user.findMany({
      where: { houseNumber: { not: null }, role: "COLONO" },
      select: { houseNumber: true, firstName: true, lastName: true },
      orderBy: [{ houseNumber: "asc" }, { lastName: "asc" }],
    }),
    prisma.monthlyFee.findMany({
      where: { concept: FEE_CONCEPT.MANTENIMIENTO },
      select: { houseNumber: true },
      distinct: ["houseNumber"],
    }),
  ]);

  const fromYear =
    opts?.fromYear ??
    feeBounds._min.year ??
    now.year;
  const fromMonth = opts?.fromMonth ?? feeBounds._min.month ?? 1;
  const toYear = opts?.toYear ?? Math.max(feeBounds._max.year ?? now.year, now.year);
  const toMonth =
    opts?.toMonth ??
    (toYear === now.year
      ? now.month
      : feeBounds._max.month ?? now.month);

  const periods = buildPeriods(fromYear, fromMonth, toYear, toMonth);
  const currentKey = periodKey(now.year, now.month);

  const residentsByHouse = new Map<string, string[]>();
  for (const u of housesWithResidents) {
    if (!u.houseNumber) continue;
    const list = residentsByHouse.get(u.houseNumber) ?? [];
    list.push(`${u.firstName} ${u.lastName}`.trim());
    residentsByHouse.set(u.houseNumber, list);
  }

  const houseSet = new Set<string>();
  for (const h of residentsByHouse.keys()) houseSet.add(h);
  for (const f of feeHouses) houseSet.add(f.houseNumber);
  const houses = [...houseSet].sort(sortHouse);

  const fees = await prisma.monthlyFee.findMany({
    where: {
      concept: FEE_CONCEPT.MANTENIMIENTO,
      OR: [
        { year: { gt: fromYear } },
        { year: fromYear, month: { gte: fromMonth } },
      ],
      AND: [
        {
          OR: [
            { year: { lt: toYear } },
            { year: toYear, month: { lte: toMonth } },
          ],
        },
      ],
    },
    select: {
      id: true,
      houseNumber: true,
      year: true,
      month: true,
      amount: true,
      status: true,
      withSurcharge: true,
      paidAt: true,
    },
  });

  const feeMap = new Map<string, (typeof fees)[number]>();
  for (const f of fees) {
    feeMap.set(`${f.houseNumber}|${f.year}|${f.month}`, f);
  }

  const rows: PaymentMatrixRow[] = houses.map((houseNumber) => {
    const cells: PaymentMatrixCell[] = periods.map((p) => {
      const fee = feeMap.get(`${houseNumber}|${p.year}|${p.month}`);
      if (!fee) {
        const future = p.key > currentKey;
        return {
          year: p.year,
          month: p.month,
          label: p.label,
          status: future ? "FUTURO" : "SIN_REGISTRO",
          amount: future ? 0 : FEE_BASE_AMOUNT,
          withSurcharge: false,
          paidAt: null,
          feeId: null,
        };
      }
      return {
        year: p.year,
        month: p.month,
        label: p.label,
        status: fee.status as MatrixCellStatus,
        amount: fee.amount,
        withSurcharge: fee.withSurcharge,
        paidAt: fee.paidAt?.toISOString() ?? null,
        feeId: fee.id,
      };
    });

    const unpaid = cells.filter(
      (c) =>
        c.status === "ADEUDO" ||
        c.status === "PENDIENTE" ||
        c.status === "SIN_REGISTRO",
    );

    return {
      houseNumber,
      residents: residentsByHouse.get(houseNumber) ?? [],
      cells,
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((sum, c) => sum + c.amount, 0),
    };
  });

  const rangeLabel =
    periods.length === 0
      ? "Sin datos"
      : `${periods[0].label} – ${periods.at(-1)!.label}`;

  return { periods, rows, rangeLabel };
}
