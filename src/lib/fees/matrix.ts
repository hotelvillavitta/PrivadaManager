import "server-only";

import { prisma } from "@/lib/db";
import {
  FEE_BASE_AMOUNT,
  FEE_CONCEPT,
  calendarPartsInTijuana,
  feeLabel,
} from "@/lib/utils";
import {
  MATRIX_START,
  unpaidForPeriods,
  type PaymentMatrix,
  type PaymentMatrixCell,
  type PaymentMatrixPeriod,
  type PaymentMatrixRow,
  type MatrixCellStatus,
} from "@/lib/fees/matrix-shared";

export type {
  MatrixCellStatus,
  PaymentMatrix,
  PaymentMatrixCell,
  PaymentMatrixPeriod,
  PaymentMatrixRow,
} from "@/lib/fees/matrix-shared";
export { MATRIX_START, unpaidForPeriods, isUnpaidStatus } from "@/lib/fees/matrix-shared";

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

/** Matriz casa × mes para administración de cobranza (desde AGO21). */
export async function getPaymentMatrix(opts?: {
  fromYear?: number;
  fromMonth?: number;
  toYear?: number;
  toMonth?: number;
}): Promise<PaymentMatrix> {
  const now = calendarPartsInTijuana();
  const startKey = periodKey(MATRIX_START.year, MATRIX_START.month);

  const [feeBounds, housesWithResidents, feeHouses] = await Promise.all([
    prisma.monthlyFee.aggregate({
      where: {
        concept: FEE_CONCEPT.MANTENIMIENTO,
        OR: [
          { year: { gt: MATRIX_START.year } },
          { year: MATRIX_START.year, month: { gte: MATRIX_START.month } },
        ],
      },
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

  // Nunca antes de AGO21.
  let fromYear = opts?.fromYear ?? MATRIX_START.year;
  let fromMonth = opts?.fromMonth ?? MATRIX_START.month;
  if (periodKey(fromYear, fromMonth) < startKey) {
    fromYear = MATRIX_START.year;
    fromMonth = MATRIX_START.month;
  }

  const maxYear = feeBounds._max.year ?? now.year;
  const maxMonth = feeBounds._max.month ?? now.month;
  const endFromData = periodKey(maxYear, maxMonth);
  const endFromNow = periodKey(now.year, now.month);
  const endKey = Math.max(endFromData, endFromNow, startKey);

  const decodePeriod = (key: number) => {
    const month = ((key - 1) % 12) + 1;
    const year = Math.floor((key - month) / 12);
    return { year, month };
  };
  const end = decodePeriod(endKey);

  let toYear = opts?.toYear ?? end.year;
  let toMonth =
    opts?.toMonth ?? (opts?.toYear != null ? 12 : end.month);

  if (periodKey(toYear, toMonth) < startKey) {
    toYear = MATRIX_START.year;
    toMonth = MATRIX_START.month;
  }

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
          status: future ? "FUTURO" : ("SIN_REGISTRO" as MatrixCellStatus),
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

    const { unpaidCount, unpaidAmount } = unpaidForPeriods(cells, periods);

    return {
      houseNumber,
      residents: residentsByHouse.get(houseNumber) ?? [],
      cells,
      unpaidCount,
      unpaidAmount,
    };
  });

  const rangeLabel =
    periods.length === 0
      ? "Sin datos"
      : `${periods[0].label} – ${periods.at(-1)!.label}`;

  return {
    periods,
    rows,
    rangeLabel,
    startLabel: feeLabel(MATRIX_START.year, MATRIX_START.month),
  };
}

/** Años disponibles en el concentrado (desde AGO21). */
export async function getPaymentMatrixYears(): Promise<number[]> {
  const now = calendarPartsInTijuana();
  const rows = await prisma.monthlyFee.findMany({
    where: {
      concept: FEE_CONCEPT.MANTENIMIENTO,
      OR: [
        { year: { gt: MATRIX_START.year } },
        { year: MATRIX_START.year, month: { gte: MATRIX_START.month } },
      ],
    },
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  const set = new Set(rows.map((r) => r.year));
  set.add(now.year);
  if (now.year >= MATRIX_START.year) set.add(MATRIX_START.year);
  return [...set].sort((a, b) => b - a);
}

/** Rango por defecto: año en curso (carga rápida). */
export function currentYearMatrixRange() {
  const now = calendarPartsInTijuana();
  const fromMonth =
    now.year === MATRIX_START.year ? MATRIX_START.month : 1;
  return {
    fromYear: now.year,
    fromMonth,
    toYear: now.year,
    toMonth: now.month,
  };
}

export function yearMatrixRange(year: number) {
  const now = calendarPartsInTijuana();
  const fromMonth =
    year === MATRIX_START.year ? MATRIX_START.month : 1;
  const toMonth = year === now.year ? now.month : 12;
  return {
    fromYear: year,
    fromMonth,
    toYear: year,
    toMonth,
  };
}
