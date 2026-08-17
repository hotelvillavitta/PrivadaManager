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
import { CuotasClient } from "./cuotas-client";

export default async function CuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ casa?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const isAdmin = session.user.role === "ADMIN";
  const requested = params.casa?.trim();
  const houseNumber =
    isAdmin && requested
      ? requested
      : (session.user.houseNumber ?? "0");

  const [fees, palapaPayments, fines, summary, houses, houseDirectory] =
    await Promise.all([
      getFeesForHouse(houseNumber),
      getPalapaPaymentsForHouse(houseNumber),
      getFinesForHouse(houseNumber),
      getFeeSummary(houseNumber),
      isAdmin ? getHouseNumbers() : Promise.resolve([] as string[]),
      isAdmin
        ? getHousesWithResidents()
        : Promise.resolve(
            [] as { houseNumber: string; residents: string[] }[],
          ),
    ]);

  const resident =
    isAdmin && requested && requested !== session.user.houseNumber
      ? null
      : session.user;

  return (
    <CuotasClient
      isAdmin={isAdmin}
      houseNumber={houseNumber}
      houses={houses}
      houseDirectory={houseDirectory}
      accessCode={
        resident?.houseNumber === houseNumber
          ? session.user.accessCode
          : null
      }
      summary={summary}
      fees={fees.map((f) => ({
        id: f.id,
        year: f.year,
        month: f.month,
        amount: f.amount,
        concept: f.concept,
        status: f.status,
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
