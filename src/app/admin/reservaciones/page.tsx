import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { PendingReservationsAdmin } from "./pending-reservations-admin";

export default async function AdminReservacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const data = await getAdminDashboard();
  const pending = data.pendingReservations;

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Reservaciones de palapa"
        description="Aprueba o rechaza solicitudes. El calendario público es solo consulta y reserva personal."
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
      </div>
    </div>
  );
}
