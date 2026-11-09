export type ReservationPaymentStatus = "PAGADA" | "POR_VALIDAR" | "SIN_PAGO";

type ReservationLike = {
  id: string;
  date: string;
  houseNumber: string | null;
};

type PaymentLike = {
  houseNumber: string;
  paidAt: Date;
  ledger: "APPROVED" | "PENDING" | null;
};

/**
 * Cada cobro de palapa de una casa cubre una reservación confirmada,
 * de la más antigua a la más reciente. El cobro no guarda la fecha del evento.
 */
export function assignPalapaPayments(
  reservations: ReservationLike[],
  payments: PaymentLike[],
) {
  const byHouse = new Map<string, PaymentLike[]>();
  for (const payment of [...payments].sort(
    (a, b) => a.paidAt.getTime() - b.paidAt.getTime(),
  )) {
    const list = byHouse.get(payment.houseNumber) ?? [];
    list.push(payment);
    byHouse.set(payment.houseNumber, list);
  }

  const status = new Map<string, ReservationPaymentStatus>();
  const grouped = new Map<string, ReservationLike[]>();
  for (const reservation of reservations) {
    const house = reservation.houseNumber ?? "";
    const list = grouped.get(house) ?? [];
    list.push(reservation);
    grouped.set(house, list);
  }

  for (const [house, list] of grouped) {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const queue = house ? (byHouse.get(house) ?? []) : [];
    let index = 0;
    for (const reservation of list) {
      const payment = queue[index];
      if (!payment) {
        status.set(reservation.id, "SIN_PAGO");
        continue;
      }
      index += 1;
      status.set(
        reservation.id,
        payment.ledger === "PENDING" ? "POR_VALIDAR" : "PAGADA",
      );
    }
  }

  return status;
}
