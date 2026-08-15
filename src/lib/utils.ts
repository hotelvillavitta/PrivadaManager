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

/** Partes de fecha calendario en zona America/Tijuana. */
export function calendarPartsInTijuana(asOf: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Tijuana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(asOf);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

/**
 * Periodo sugerido sin mirar adeudos de la casa:
 * mes en curso si estamos dentro de los primeros FEE_GRACE_DAYS días;
 * si no, el mes siguiente.
 */
export function resolveFineBillingPeriod(asOf: Date = new Date()) {
  const { year, month, day } = calendarPartsInTijuana(asOf);
  if (day <= FEE_GRACE_DAYS) {
    return { year, month };
  }
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function nextFeePeriod(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/**
 * Elige el periodo de cuota al que debe sumarse una multa:
 * 1) adeudo más antiguo ya registrado (mes actual o anterior);
 * 2) si no hay filas, el mes calendario actual si aún no está pagado;
 * 3) si está al corriente, el siguiente mes abierto / periodo de cobro.
 */
export function pickFineBillingPeriod(opts: {
  asOf?: Date;
  unpaidFees: { year: number; month: number; status: string }[];
  currentMonthFeeStatus?: string | null;
}) {
  const asOf = opts.asOf ?? new Date();
  const { year: cy, month: cm } = calendarPartsInTijuana(asOf);
  const currentKey = cy * 12 + cm;

  const dueUnpaid = opts.unpaidFees
    .filter((f) => f.year * 12 + f.month <= currentKey)
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

  if (dueUnpaid.length) {
    return { year: dueUnpaid[0].year, month: dueUnpaid[0].month };
  }

  if (opts.currentMonthFeeStatus !== "PAGADO") {
    return { year: cy, month: cm };
  }

  return resolveFineBillingPeriod(asOf);
}

/** Compara periodos de cuota: negativo si a < b, 0 si iguales, positivo si a > b. */
export function compareFeePeriod(
  a: { year: number; month: number },
  b: { year: number; month: number },
) {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** True si el periodo a es estrictamente anterior al periodo b. */
export function isFeePeriodBefore(
  a: { year: number; month: number },
  b: { year: number; month: number },
) {
  return compareFeePeriod(a, b) < 0;
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
