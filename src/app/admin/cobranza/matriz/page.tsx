import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getPaymentMatrix } from "@/lib/fees/matrix";
import { AdminBackLink } from "../../admin-back-link";
import { CobranzaMatrixClient } from "./cobranza-matrix-client";

export default async function CobranzaMatrizPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const matrix = await getPaymentMatrix();

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Concentrado de cuotas"
        description="Tabla casa × mes: quién pagó, quién adeuda, importar Excel y descargar concentrado."
      />
      <div className="mx-auto max-w-[100vw] space-y-4 overflow-x-hidden px-3 sm:px-4 lg:max-w-7xl lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AdminBackLink href="/admin" />
          <Link
            href="/admin/cobranza"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-primary"
          >
            Cobrar por casa
          </Link>
        </div>
        <CobranzaMatrixClient matrix={matrix} />
      </div>
    </div>
  );
}
