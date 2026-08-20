import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getFeeSummary,
  getFeesForHouse,
  getFinesForHouse,
  getHouseNumbers,
  getHousesWithResidents,
  getPalapaPaymentsForHouse,
} from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { CuotasClient } from "@/app/cuotas/cuotas-client";

export default async function AdminCobranzaPage({
  searchParams,
}: {
  searchParams: Promise<{ casa?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const [houses, houseDirectory] = await Promise.all([
    getHouseNumbers(),
    getHousesWithResidents(),
  ]);
  const houseNumber =
    params.casa?.trim() ||
    houses[0] ||
    session.user.houseNumber ||
    "1";

  const [fees, palapaPayments, fines, summary] = await Promise.all([
    getFeesForHouse(houseNumber),
    getPalapaPaymentsForHouse(houseNumber),
    getFinesForHouse(houseNumber),
    getFeeSummary(houseNumber),
  ]);

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-4xl px-4 pt-6 lg:px-6">
        <AdminBackLink />
      </div>
      <CuotasClient
        isAdmin
        houseBasePath="/admin/cobranza"
        houseNumber={houseNumber}
        houses={houses}
        houseDirectory={houseDirectory}
        accessCode={null}
        gateCode={null}
        summary={summary}
        fees={fees.map((f) => ({
          id: f.id,
          year: f.year,
          month: f.month,
          amount: f.amount,
          concept: f.concept,
          status: f.status,
          withSurcharge: f.withSurcharge,
        }))}
        palapaPayments={palapaPayments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          paidAt: payment.paidAt.toISOString(),
        }))}
        fines={fines.map((f) => ({
          id: f.id,
          category: f.category,
          cause: f.cause,
          regulationArticle: f.regulationArticle,
          regulationExcerpt: f.regulationExcerpt,
          amount: f.amount,
          status: f.status,
          notes: f.notes,
          issuedAt: f.issuedAt.toISOString(),
          paidAt: f.paidAt?.toISOString() ?? null,
          billingYear: f.billingYear,
          billingMonth: f.billingMonth,
        }))}
      />
    </div>
  );
}
