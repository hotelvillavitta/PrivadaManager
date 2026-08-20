import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getFeeSummary,
  getFeesForHouse,
  getFinesForHouse,
  getPalapaPaymentsForHouse,
} from "@/lib/queries";
import { CuotasClient } from "./cuotas-client";

export default async function CuotasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const houseNumber = session.user.houseNumber ?? "0";

  const [fees, palapaPayments, fines, summary] = await Promise.all([
    getFeesForHouse(houseNumber),
    getPalapaPaymentsForHouse(houseNumber),
    getFinesForHouse(houseNumber),
    getFeeSummary(houseNumber),
  ]);

  return (
    <CuotasClient
      isAdmin={false}
      houseNumber={houseNumber}
      accessCode={session.user.accessCode}
      gateCode={session.user.gateCode}
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
  );
}
