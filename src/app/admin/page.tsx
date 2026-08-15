import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Check,
  CircleDollarSign,
  Newspaper,
  Users,
  Wallet,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { updateReservationStatus } from "@/lib/actions/portal";
import { getAdminDashboard, getHouseNumbers } from "@/lib/queries";
import { feeLabel, formatCurrency } from "@/lib/utils";
import { ResidentsAdmin } from "./residents-admin";
import { FinesAdmin } from "./fines-admin";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [data, houses] = await Promise.all([
    getAdminDashboard(),
    getHouseNumbers(),
  ]);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Panel administrativo"
        title="Administración"
        description="Resumen operativo de residentes, reservaciones, cuotas, multas y comunicación."
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            icon={<Users className="h-5 w-5" />}
            value={String(data.residentCount)}
            label="Residentes"
          />
          <Stat
            icon={<CalendarDays className="h-5 w-5" />}
            value={String(data.pendingReservations.length)}
            label="Reservas pendientes"
          />
          <Stat
            icon={<Newspaper className="h-5 w-5" />}
            value={String(data.newsCount)}
            label="Comunicados"
          />
          <Stat
            icon={<Wallet className="h-5 w-5" />}
            value={String(data.paidThisMonth)}
            label="Pagos este mes"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickLink href="/noticias" label="Publicar noticia" />
          <QuickLink href="/reservaciones" label="Ver reservaciones" />
          <QuickLink href="/cuotas" label="Gestionar cuotas" />
          <QuickLink href="/finanzas" label="Registrar finanzas" />
        </div>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl text-primary-dark">
              Reservaciones pendientes
            </h2>
            <Link
              href="/reservaciones"
              className="text-sm text-primary hover:underline"
            >
              Ver calendario
            </Link>
          </div>
          {data.pendingReservations.length === 0 ? (
            <p className="text-sm text-muted">No hay solicitudes pendientes.</p>
          ) : (
            <ul className="space-y-3">
              {data.pendingReservations.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 rounded-xl bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-primary-dark">
                      {r.eventName}
                    </p>
                    <p className="text-sm text-muted">
                      {r.date} · {r.user.firstName} {r.user.lastName}
                      {r.user.houseNumber
                        ? ` · Casa ${r.user.houseNumber}`
                        : ""}{" "}
                      · {r.guests} personas
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/reservaciones?solicitud=${r.id}`}
                      className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface"
                    >
                      Ver / decidir
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await updateReservationStatus(r.id, "APPROVED");
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Aprobar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <FinesAdmin
            houses={houses}
            pendingFines={data.pendingFines.map((f) => ({
              id: f.id,
              houseNumber: f.houseNumber,
              category: f.category,
              cause: f.cause,
              regulationArticle: f.regulationArticle,
              amount: f.amount,
              notes: f.notes,
              issuedAt: f.issuedAt.toISOString(),
            }))}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <ResidentsAdmin
              currentUserId={session.user.id}
              residents={data.residents.map((u) => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                houseNumber: u.houseNumber,
                accessCode: u.accessCode,
                role: u.role,
              }))}
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-primary-dark">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              Adeudos / pendientes
            </h2>
            {data.debtFees.length === 0 ? (
              <p className="text-sm text-muted">
                No hay cuotas con adeudo o pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.debtFees.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-col gap-1 rounded-xl bg-background px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-words">
                      Casa {f.houseNumber} · {feeLabel(f.year, f.month)}
                    </span>
                    <span
                      className={`self-start text-xs font-bold uppercase sm:self-auto sm:text-right ${
                        f.status === "ADEUDO" ? "text-danger" : "text-warning"
                      }`}
                    >
                      {f.status} ·{" "}
                      {f.concept === "PALAPA" ? "Palapa" : "Mantenimiento"} ·{" "}
                      {formatCurrency(f.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="mb-2 text-primary">{icon}</div>
      <p className="font-display text-3xl text-primary-dark">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-primary-dark transition hover:border-primary/40 hover:bg-primary-soft"
    >
      {label}
    </Link>
  );
}
