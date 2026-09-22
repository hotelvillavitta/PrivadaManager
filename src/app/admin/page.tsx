import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Info,
  Newspaper,
  Palette,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getAdminHubCounts } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

type ModuleItem = {
  href: string;
  title: string;
  description: string;
  icon: typeof Wallet;
  badge?: number;
};

const categories: {
  title: string;
  items: Omit<ModuleItem, "badge">[];
}[] = [
  {
    title: "Finanzas y cobranza",
    items: [
      {
        href: "/admin/cobranza",
        title: "Cobranza",
        description: "Cobrar cuotas, recargos y palapa",
        icon: Wallet,
      },
      {
        href: "/admin/cobranza/matriz",
        title: "Calendario de cuotas",
        description: "Matriz casa × mes, importar y exportar",
        icon: BarChart3,
      },
      {
        href: "/admin/finanzas",
        title: "Tesorería",
        description: "Validar ingresos, gastos e historial",
        icon: CircleDollarSign,
      },
      {
        href: "/admin/analiticos",
        title: "Analíticos",
        description: "KPIs de cobranza y morosidad",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Comunidad",
    items: [
      {
        href: "/admin/residentes",
        title: "Residentes y casas",
        description: "Usuarios, casas y contraseñas",
        icon: Users,
      },
      {
        href: "/admin/noticias",
        title: "Noticias",
        description: "Publicar y editar avisos",
        icon: Newspaper,
      },
      {
        href: "/admin/reservaciones",
        title: "Reservaciones",
        description: "Aprobar solicitudes de palapa",
        icon: CalendarDays,
      },
      {
        href: "/admin/directorio",
        title: "Directorio",
        description: "Contactos y proveedores",
        icon: Building2,
      },
    ],
  },
  {
    title: "Operación",
    items: [
      {
        href: "/admin/reportes",
        title: "Reportes",
        description: "Desperfectos reportados por vecinos",
        icon: ClipboardList,
      },
      {
        href: "/admin/multas",
        title: "Multas",
        description: "Emitir y anular sanciones",
        icon: ShieldAlert,
      },
    ],
  },
  {
    title: "Configuración",
    items: [
      {
        href: "/admin/informacion",
        title: "Información",
        description: "Contacto, capacidad, horarios y reglamento",
        icon: Info,
      },
      {
        href: "/admin/personalizacion",
        title: "Personalización",
        description: "Nombre, logo y color de la privada",
        icon: Palette,
      },
    ],
  },
];

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const data = await getAdminHubCounts();

  const attention = [
    {
      href: "/admin/cobranza",
      title:
        data.unpaidFeesCount > 0
          ? `${data.unpaidFeesCount} cuotas pendientes`
          : "Sin cuotas pendientes",
      description: "Residentes con saldo pendiente",
      tone: "danger" as const,
      icon: AlertTriangle,
      show: data.unpaidFeesCount > 0,
    },
    {
      href: "/admin/reservaciones",
      title:
        data.pendingReservations > 0
          ? `${data.pendingReservations} reservaciones por aprobar`
          : "Sin reservaciones pendientes",
      description: "Solicitudes de palapa y áreas comunes",
      tone: "warning" as const,
      icon: CalendarDays,
      show: data.pendingReservations > 0,
    },
    {
      href: "/admin/reportes",
      title:
        data.openIssues > 0
          ? `${data.openIssues} reportes abiertos`
          : "Sin reportes abiertos",
      description: "Desperfectos reportados por vecinos",
      tone: "info" as const,
      icon: ClipboardList,
      show: data.openIssues > 0,
    },
    {
      href: "/admin/finanzas",
      title:
        data.pendingTreasury > 0
          ? `${data.pendingTreasury} ingresos por validar`
          : "Tesorería al día",
      description: "Cobros pendientes de publicar en el saldo",
      tone: "primary" as const,
      icon: CircleDollarSign,
      show: data.pendingTreasury > 0,
    },
  ].filter((a) => a.show);

  const badgeByHref: Record<string, number> = {
    "/admin/residentes": data.residentCount,
    "/admin/reservaciones": data.pendingReservations,
    "/admin/reportes": data.openIssues,
    "/admin/multas": data.pendingFines,
    "/admin/finanzas": data.pendingTreasury,
  };

  return (
    <div className="pb-16">
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-7 sm:pb-8 sm:pt-10 lg:px-6 lg:pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-primary uppercase sm:text-xs">
              Comité
            </p>
            <h1 className="font-display text-3xl leading-tight text-primary-dark sm:text-4xl lg:text-5xl">
              Administración
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
              Controla residentes, cuotas, reservaciones, reportes y más, en un
              solo lugar.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-6">
        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            href="/admin/residentes"
            icon={<Users className="h-5 w-5" />}
            title={`${data.houseCount || data.residentCount} Casas`}
            subtitle={
              data.residentCount === data.houseCount
                ? "Cuentas con residencia"
                : `${data.residentCount} cuentas con residencia`
            }
          />
          <KpiCard
            href="/admin/cobranza"
            icon={<span className="text-lg font-bold">$</span>}
            title={formatCurrency(data.collectedMonth)}
            subtitle={`Cobrado este mes de ${formatCurrency(data.billedMonth)}`}
            progress={data.collectionRateMonth}
          />
          <KpiCard
            href="/admin/reportes"
            icon={<ClipboardList className="h-5 w-5" />}
            title={`${data.openIssues} Reportes`}
            subtitle={
              data.openIssues > 0 ? "Requieren atención" : "Sin pendientes"
            }
            accent={data.openIssues > 0 ? "warning" : undefined}
          />
          <KpiCard
            href="/admin/reservaciones"
            icon={<CalendarDays className="h-5 w-5" />}
            title={`${data.pendingReservations} Reservaciones`}
            subtitle={
              data.pendingReservations > 0 ? "Por aprobar" : "Al corriente"
            }
            accent={data.pendingReservations > 0 ? "warning" : undefined}
          />
        </div>

        {/* Atención */}
        {attention.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-2xl text-primary-dark">
              Requiere tu atención
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              {attention.map((item, i) => {
                const Icon = item.icon;
                const toneClass =
                  item.tone === "danger"
                    ? "bg-danger-soft text-danger"
                    : item.tone === "warning"
                      ? "bg-warning-soft text-warning"
                      : item.tone === "info"
                        ? "bg-info-soft text-info"
                        : "bg-primary-soft text-primary";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-background sm:gap-4 sm:px-5 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-primary-dark">
                        {item.title}
                      </span>
                      <span className="block text-sm text-muted">
                        {item.description}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary">
                      Ver
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Módulos por categoría */}
        <section className="space-y-8">
          <h2 className="font-display text-2xl text-primary-dark">
            Módulos de administración
          </h2>

          {categories.map((cat) => (
            <div key={cat.title}>
              <h3 className="mb-3 text-sm font-bold tracking-wide text-muted uppercase">
                {cat.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {cat.items.map(({ href, title, description, icon: Icon }) => {
                  const badge = badgeByHref[href];
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="group flex min-h-[4.25rem] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3.5 shadow-sm transition hover:border-primary/35 hover:bg-primary-soft/30 active:scale-[0.99] sm:gap-4 sm:px-4"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                        <Icon className="h-5 w-5" strokeWidth={2.25} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-primary-dark">
                            {title}
                          </span>
                          {badge != null && badge > 0 ? (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                              {badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-sm leading-snug text-muted">
                          {description}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-border transition group-hover:text-primary" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  href,
  icon,
  title,
  subtitle,
  progress,
  accent,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  progress?: number;
  accent?: "warning";
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary/35 hover:shadow-md sm:p-5"
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
          accent === "warning"
            ? "bg-warning-soft text-warning"
            : "bg-primary-soft text-primary"
        }`}
      >
        {icon}
      </div>
      <p className="font-display text-xl font-bold leading-tight text-primary-dark sm:text-2xl">
        {title}
      </p>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      {typeof progress === "number" && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-muted">
            <span>Avance del mes</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
