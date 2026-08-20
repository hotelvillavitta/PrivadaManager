import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFinanceSummary, getPrivada } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { FinanzasClient } from "@/app/finanzas/finanzas-client";

export default async function AdminFinanzasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [summary, privada] = await Promise.all([
    getFinanceSummary(),
    getPrivada(),
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
      />
    </div>
  );
}
