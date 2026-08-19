import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getCollectionKpis } from "@/lib/kpis";
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
        title="Cobranza"
        description="Lectura de cuotas reales de la privada: tasa de cobro, adeudos y morosidad por casa."
      />
      <div className="mx-auto max-w-6xl space-y-4 px-4 lg:px-6">
        <Link
          href="/admin"
          className="inline-flex text-sm text-primary hover:underline"
        >
          ← Volver a administración
        </Link>
        <KpisDashboard data={data} />
      </div>
    </div>
  );
}
