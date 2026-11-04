import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { listDebtNoticeHouses } from "@/lib/fees/debt-notices";
import { getPrivada } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { DebtNoticesAdmin } from "./avisos-adeudo-client";

export default async function AdminDebtNoticesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [houses, privada] = await Promise.all([
    listDebtNoticeHouses(),
    getPrivada(),
  ]);
  const issuedOnLabel = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Tijuana",
  }).format(new Date());

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Avisos de adeudo"
        description="Elige las casas con mantenimiento pendiente y envía el aviso por correo."
      />
      <div className="mx-auto max-w-6xl space-y-4 px-4 lg:px-6">
        <AdminBackLink />
        <DebtNoticesAdmin
          houses={houses}
          issuedOnLabel={issuedOnLabel}
          privadaName={privada.name}
        />
      </div>
    </div>
  );
}
