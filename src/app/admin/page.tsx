import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
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
    description: "Usuarios, casas y contraseñas",
    icon: Users,
    badgeKey: "residents" as const,
  },
  {
    href: "/admin/cobranza",
    title: "Cobranza",
    description: "Cobrar cuotas, recargos y palapa",
    icon: Wallet,
    badgeKey: null,
  },
  {
    href: "/admin/multas",
    title: "Multas",
    description: "Emitir y anular sanciones",
    icon: ShieldAlert,
    badgeKey: "fines" as const,
  },
  {
    href: "/admin/reservaciones",
    title: "Reservaciones",
    description: "Aprobar solicitudes de palapa",
    icon: CalendarDays,
    badgeKey: "reservations" as const,
  },
  {
    href: "/admin/noticias",
    title: "Noticias",
    description: "Publicar y editar avisos",
    icon: Newspaper,
    badgeKey: null,
  },
  {
    href: "/admin/directorio",
    title: "Directorio",
    description: "Contactos y proveedores",
    icon: Building2,
    badgeKey: null,
  },
  {
    href: "/admin/finanzas",
    title: "Finanzas",
    description: "Registrar ingresos y gastos",
    icon: CircleDollarSign,
    badgeKey: null,
  },
  {
    href: "/admin/analiticos",
    title: "Analíticos",
    description: "KPIs de cobranza y morosidad",
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
    fines: data.pendingFines.length,
  };

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Comité"
        title="Administración"
        description="Elige una sección. Cada módulo se abre por separado."
      />

      <div className="mx-auto max-w-2xl space-y-3 px-4 lg:px-6">
        {modules.map(({ href, title, description, icon: Icon, badgeKey }) => {
          const badge = badgeKey ? badges[badgeKey] : null;
          return (
            <Link
              key={href}
              href={href}
              className="flex min-h-[4.5rem] items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-sm transition hover:border-primary/40 hover:bg-primary-soft/40 active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display text-xl text-primary-dark">
                    {title}
                  </span>
                  {badge != null && badge > 0 ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-sm text-muted">
                  {description}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-border" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
