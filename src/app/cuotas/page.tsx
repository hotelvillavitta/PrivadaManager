import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getFeeSummary,
  getFeesForHouse,
  getHouseNumbers,
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

  const [fees, summary, houses] = await Promise.all([
    getFeesForHouse(houseNumber),
    getFeeSummary(houseNumber),
    isAdmin ? getHouseNumbers() : Promise.resolve([] as string[]),
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
        status: f.status,
      }))}
    />
  );
}
