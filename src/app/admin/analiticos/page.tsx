import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getCollectionKpis } from "@/lib/kpis";
import { AdminBackLink } from "../admin-back-link";
import { KpisDashboard } from "./kpis-dashboard";

export default async function AnaliticosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const data = await getCollectionKpis();

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Analíticos y KPIs"
        description="Lectura de cuotas reales de la privada: tasa de cobro, adeudos y morosidad por casa."
      />
      <div className="mx-auto max-w-6xl min-w-0 space-y-4 overflow-x-hidden px-3 sm:px-4 lg:px-6">
        <AdminBackLink />
        <KpisDashboard data={data} />
      </div>
    </div>
  );
}
