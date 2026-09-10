import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getHouseNumbers, getPendingFines } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { FinesAdmin } from "../fines-admin";

export default async function AdminMultasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [pendingFines, houses] = await Promise.all([
    getPendingFines(30),
    getHouseNumbers(),
  ]);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Multas y sanciones"
        description="Emite faltas al reglamento y consulta las pendientes de cobro."
      />
      <div className="mx-auto max-w-4xl space-y-4 px-4 lg:px-6">
        <AdminBackLink />
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <FinesAdmin
            houses={houses}
            pendingFines={pendingFines.map((f) => ({
              id: f.id,
              houseNumber: f.houseNumber,
              category: f.category,
              cause: f.cause,
              regulationArticle: f.regulationArticle,
              amount: f.amount,
              notes: f.notes,
              issuedAt: f.issuedAt.toISOString(),
              billingYear: f.billingYear,
              billingMonth: f.billingMonth,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
