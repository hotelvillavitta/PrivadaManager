import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFinanceSummary, getPrivada } from "@/lib/queries";
import { FinanzasClient } from "./finanzas-client";

export default async function FinanzasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [summary, privada] = await Promise.all([
    getFinanceSummary(),
    getPrivada(),
  ]);

  return (
    <FinanzasClient
      isAdmin={false}
      privadaName={privada.name}
      summary={summary}
    />
  );
}
