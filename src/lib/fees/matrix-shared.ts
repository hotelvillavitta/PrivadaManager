import { FEE_BASE_AMOUNT, FEE_LATE_SURCHARGE, isFeePaymentLate } from "@/lib/utils";

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
  startLabel: string;
};

/** Inicio formal de cobranza en Grenache. */
export const MATRIX_START = { year: 2021, month: 8 } as const;

export function isUnpaidStatus(status: MatrixCellStatus) {
  return (
    status === "ADEUDO" ||
    status === "PENDIENTE" ||
    status === "SIN_REGISTRO"
  );
}

/** Totales de adeudo solo sobre un subconjunto de periodos (p. ej. un año). */
export function unpaidForPeriods(
  cells: PaymentMatrixCell[],
  periods: { year: number; month: number }[],
) {
  let unpaidCount = 0;
  let unpaidAmount = 0;
  for (const p of periods) {
    const cell = cells.find((c) => c.year === p.year && c.month === p.month);
    if (!cell || !isUnpaidStatus(cell.status)) continue;
    unpaidCount += 1;
    if (cell.amount > 0) {
      unpaidAmount += cell.amount;
    } else {
      unpaidAmount += isFeePaymentLate(p.year, p.month)
        ? FEE_BASE_AMOUNT + FEE_LATE_SURCHARGE
        : FEE_BASE_AMOUNT;
    }
  }
  return { unpaidCount, unpaidAmount };
}
