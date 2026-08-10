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
