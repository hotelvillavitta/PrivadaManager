export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

export const MONTH_LABELS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

export function feeLabel(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]}${String(year).slice(-2)}`;
}

/** Cuota base mensual de mantenimiento (MXN). */
export const FEE_BASE_AMOUNT = 200;
/** Recargo si se paga después del día 10 del mes. */
export const FEE_LATE_SURCHARGE = 50;
/** Días de gracia al inicio del mes sin recargo. */
export const FEE_GRACE_DAYS = 10;
/** Cuota por uso de palapa (MXN). */
export const FEE_PALAPA_AMOUNT = 200;

export const FEE_CONCEPT = {
  MANTENIMIENTO: "MANTENIMIENTO",
  PALAPA: "PALAPA",
} as const;

export type FeeConcept = (typeof FEE_CONCEPT)[keyof typeof FEE_CONCEPT];

/** Filtro: cuotas de mantenimiento del mes en curso o anteriores (no futuros). */
export function overdueMaintenanceWhere(
  houseNumber: string,
  asOf: Date = new Date(),
) {
  const year = asOf.getFullYear();
  const month = asOf.getMonth() + 1;
  return {
    houseNumber,
    concept: "MANTENIMIENTO" as const,
    status: { in: ["ADEUDO" as const, "PENDIENTE" as const] },
    OR: [
      { year: { lt: year } },
      { year, month: { lte: month } },
    ],
  };
}

export const FEE_CONCEPT_LABEL: Record<string, string> = {
  MANTENIMIENTO: "Cuota de mantenimiento",
  PALAPA: "Uso de palapa",
};

/** True si la fecha de pago es posterior al día 10 del mes de la cuota. */
export function isFeePaymentLate(
  year: number,
  month: number,
  paidAt: Date = new Date(),
) {
  const deadline = new Date(year, month - 1, FEE_GRACE_DAYS, 23, 59, 59, 999);
  return paidAt.getTime() > deadline.getTime();
}

/** Monto a cobrar: $200, o $250 si hay recargo por pago tardío. */
export function calculateFeeAmount(
  year: number,
  month: number,
  paidAt: Date = new Date(),
) {
  return isFeePaymentLate(year, month, paidAt)
    ? FEE_BASE_AMOUNT + FEE_LATE_SURCHARGE
    : FEE_BASE_AMOUNT;
}

export const NEWS_CATEGORY_LABEL: Record<string, string> = {
  IMPORTANTE: "Importante",
  REGLAMENTO: "Reglamento",
  MANTENIMIENTO: "Mantenimiento",
  AVISO: "Aviso",
  COMUNIDAD: "Comunidad",
};

export type SessionUser = {
  id: string;
  email: string;
  role: "COLONO" | "ADMIN";
  firstName: string;
  lastName: string;
  houseNumber: string | null;
  accessCode: string | null;
};
