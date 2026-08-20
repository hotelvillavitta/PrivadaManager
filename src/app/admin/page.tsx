import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Newspaper,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/queries";

const modules = [
  {
    href: "/admin/residentes",
    title: "Residentes y casas",
    description: "Alta, edición, claves de acceso y contraseñas iniciales.",
    icon: Users,
    badgeKey: "residents" as const,
  },
  {
    href: "/admin/cobranza",
    title: "Cobranza de cuotas",
    description: "Registrar pagos de mantenimiento, recargos y palapa.",
    icon: Wallet,
    badgeKey: null,
  },
  {
    href: "/admin/multas",
    title: "Multas y sanciones",
    description: "Emitir, consultar y anular faltas al reglamento.",
    icon: ShieldAlert,
    badgeKey: "fines" as const,
  },
  {
    href: "/admin/reservaciones",
    title: "Reservaciones de palapa",
    description: "Aprobar o rechazar solicitudes pendientes.",
    icon: CalendarDays,
    badgeKey: "reservations" as const,
  },
  {
    href: "/admin/noticias",
    title: "Noticias y avisos",
    description: "Publicar, editar o eliminar comunicados de la privada.",
    icon: Newspaper,
    badgeKey: "news" as const,
  },
  {
    href: "/admin/directorio",
    title: "Directorio",
    description: "Administrar contactos, comité y proveedores.",
    icon: Building2,
    badgeKey: null,
  },
  {
    href: "/admin/finanzas",
    title: "Finanzas",
    description: "Registrar ingresos o gastos del concentrado.",
    icon: CircleDollarSign,
    badgeKey: null,
  },
  {
    href: "/admin/analiticos",
    title: "Analíticos y KPIs",
    description: "Tasa de cobro, adeudos y morosidad por casa.",
    icon: BarChart3,
    badgeKey: null,
  },
];

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const data = await getAdminDashboard();
  const badges = {
    residents: data.residentCount,
    reservations: data.pendingReservations.length,
    news: data.newsCount,
    fines: data.pendingFines.length,
  };

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Panel del comité"
        title="Administración"
        description="Todas las herramientas del comité en un solo lugar. El resto del portal funciona como para cualquier residente."
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Residentes" value={String(data.residentCount)} />
          <MiniStat
            label="Reservas pendientes"
            value={String(data.pendingReservations.length)}
          />
          <MiniStat
            label="Multas pendientes"
            value={String(data.pendingFines.length)}
          />
          <MiniStat
            label="Pagos este mes"
            value={String(data.paidThisMonth)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ href, title, description, icon: Icon, badgeKey }) => {
            const badge = badgeKey ? badges[badgeKey] : null;
            return (
              <Link
                key={href}
                href={href}
                className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  {badge != null && badge > 0 ? (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <h2 className="font-display text-xl text-primary-dark">
                  {title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {description}
                </p>
                <p className="mt-4 text-xs font-semibold tracking-wide text-accent uppercase">
                  Abrir
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center shadow-sm">
      <p className="font-display text-2xl text-primary-dark">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
