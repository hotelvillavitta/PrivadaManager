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
      isAdmin={session.user.role === "ADMIN"}
      privadaName={privada.name}
      summary={{
        ...summary,
        entries: summary.entries.map((e) => ({
          id: e.id,
          type: e.type,
          category: e.category,
          description: e.description,
          amount: e.amount,
          date: e.date.toISOString(),
          readonly: e.readonly,
        })),
      }}
    />
  );
}
