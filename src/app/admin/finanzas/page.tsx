import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getFinanceEntries,
  getFinanceSummary,
  getPendingFinanceEntries,
  getPrivada,
} from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { FinanzasClient } from "@/app/finanzas/finanzas-client";

export default async function AdminFinanzasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [summary, privada, entries, pendingEntries] = await Promise.all([
    getFinanceSummary(),
    getPrivada(),
    getFinanceEntries(250),
    getPendingFinanceEntries(100),
  ]);

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-6">
        <AdminBackLink />
      </div>
      <FinanzasClient
        isAdmin
        privadaName={privada.name}
        summary={summary}
        entries={entries.map((e) => ({
          id: e.id,
          type: e.type,
          category: e.category,
          description: e.description,
          amount: e.amount,
          date: e.date.toISOString(),
          linked: Boolean(e.monthlyFee || e.palapaPayment || e.fine),
          status: "APPROVED" as const,
        }))}
        pendingEntries={pendingEntries.map((e) => ({
          id: e.id,
          type: e.type,
          category: e.category,
          description: e.description,
          amount: e.amount,
          date: e.date.toISOString(),
          linked: Boolean(e.monthlyFee || e.palapaPayment || e.fine),
          status: "PENDING" as const,
        }))}
      />
    </div>
  );
}
