export const ISSUE_CATEGORIES = [
  "Áreas comunes",
  "Portón / acceso",
  "Iluminación",
  "Jardines",
  "Palapa",
  "Seguridad",
  "Otro",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_STATUS_LABEL: Record<
  "ABIERTO" | "EN_REVISION" | "RESUELTO" | "CERRADO",
  string
> = {
  ABIERTO: "Abierto",
  EN_REVISION: "En revisión",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
};

export const ISSUE_STATUS_STYLE: Record<
  "ABIERTO" | "EN_REVISION" | "RESUELTO" | "CERRADO",
  string
> = {
  ABIERTO: "bg-warning-soft text-warning",
  EN_REVISION: "bg-info-soft text-info",
  RESUELTO: "bg-success-soft text-success",
  CERRADO: "bg-primary-soft text-muted",
};
