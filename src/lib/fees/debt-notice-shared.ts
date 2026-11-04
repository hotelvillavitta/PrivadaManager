export type DebtNoticeRecipient = {
  name: string;
  email: string;
};

export type DebtNoticeLine = {
  label: string;
  amount: number;
  amountLabel: string;
};

export type DebtNoticeHouse = {
  houseNumber: string;
  lines: DebtNoticeLine[];
  months: number;
  total: number;
  totalLabel: string;
  recipients: DebtNoticeRecipient[];
};

export const DEBT_NOTICE_CONSEQUENCES = [
  "Suspensión del acceso a reservaciones de palapa y áreas comunes.",
  "Restricción de servicios exclusivos del fraccionamiento.",
  "Posible aplicación de recargos por morosidad según el reglamento interno.",
  "Inclusión en el listado de deudores ante la Asamblea de Vecinos.",
] as const;
