import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getFeesForHouse,
  getFinesForHouse,
  getHouseNumbers,
  getHousesWithResidents,
  getPalapaPaymentsForHouse,
  summarizeFees,
} from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { CuotasClient } from "@/app/cuotas/cuotas-client";

export default async function AdminCobranzaPage({
  searchParams,
}: {
  searchParams: Promise<{ casa?: string; anio?: string; mes?: string }>;
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

  const initialYear = Number(params.anio);
  const initialMonth = Number(params.mes);

  const [fees, palapaPayments, fines] = await Promise.all([
    getFeesForHouse(houseNumber),
    getPalapaPaymentsForHouse(houseNumber),
    getFinesForHouse(houseNumber),
  ]);

  const summary = summarizeFees(
    fees,
    fines
      .filter((f) => f.status === "PENDIENTE")
      .map((f) => ({
        amount: f.amount,
        billingYear: f.billingYear,
        billingMonth: f.billingMonth,
      })),
  );

  return (
    <div className="pb-8">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 pt-6 lg:px-6">
        <AdminBackLink />
        <Link
          href="/admin/cobranza/matriz"
          className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
        >
          Ver calendario de pagos
        </Link>
      </div>
      <CuotasClient
        isAdmin
        houseBasePath="/admin/cobranza"
        houseNumber={houseNumber}
        houses={houses}
        houseDirectory={houseDirectory}
        accessCode={null}
        gateCode={null}
        initialChargeYear={
          Number.isFinite(initialYear) && initialYear > 2000
            ? initialYear
            : undefined
        }
        initialChargeMonth={
          Number.isFinite(initialMonth) &&
          initialMonth >= 1 &&
          initialMonth <= 12
            ? initialMonth
            : undefined
        }
        summary={summary}
        fees={fees.map((f) => ({
          id: f.id,
          year: f.year,
          month: f.month,
          amount: f.amount,
          amountPaid: f.amountPaid,
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
