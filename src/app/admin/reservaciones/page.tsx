import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { assignPalapaPayments } from "@/lib/reservations/payment-status";
import {
  getConfirmedReservationsAdmin,
  getHousesWithResidents,
  getPalapaPaymentsForMatching,
  getPendingReservationsAdmin,
  getPrivada,
} from "@/lib/queries";
import { calendarPartsInTijuana, fullName } from "@/lib/utils";
import { AdminBackLink } from "../admin-back-link";
import { AdminCreateReservation } from "./admin-create-reservation";
import { ConfirmedReservationsAdmin } from "./confirmed-reservations-admin";
import { PendingReservationsAdmin } from "./pending-reservations-admin";

export default async function AdminReservacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [pending, confirmed, palapaPayments, houses, privada] =
    await Promise.all([
      getPendingReservationsAdmin(),
      getConfirmedReservationsAdmin(),
      getPalapaPaymentsForMatching(),
      getHousesWithResidents(),
      getPrivada(),
    ]);
  const paymentStatus = assignPalapaPayments(
    confirmed.map((reservation) => ({
      id: reservation.id,
      date: reservation.date,
      houseNumber: reservation.user.houseNumber,
    })),
    palapaPayments.map((payment) => ({
      houseNumber: payment.houseNumber,
      paidAt: payment.paidAt,
      ledger: payment.financeEntry?.status ?? null,
    })),
  );
  const { year, month } = calendarPartsInTijuana();

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Reservaciones de palapa"
        description="Aprueba pendientes, revisa las confirmadas del mes y registra solicitudes a nombre de residentes."
      />
      <div className="mx-auto max-w-4xl space-y-4 px-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AdminBackLink />
          <Link
            href="/reservaciones"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver calendario →
          </Link>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 font-display text-2xl text-primary-dark">
            Pendientes ({pending.length})
          </h2>
          <PendingReservationsAdmin
            items={pending.map((r) => ({
              id: r.id,
              date: r.date,
              eventName: r.eventName,
              guests: r.guests,
              notes: r.notes,
              user: r.user,
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <ConfirmedReservationsAdmin
            year={year}
            month={month}
            items={confirmed.map((reservation) => ({
              id: reservation.id,
              date: reservation.date,
              eventName: reservation.eventName,
              guests: reservation.guests,
              houseNumber: reservation.user.houseNumber,
              residentName: fullName(reservation.user),
              payment: paymentStatus.get(reservation.id) ?? "SIN_PAGO",
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <AdminCreateReservation
            houses={houses}
            capacityMax={privada.capacityMax}
          />
        </section>
      </div>
    </div>
  );
}
