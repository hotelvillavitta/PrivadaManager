import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFinanceSummary, getPrivada } from "@/lib/queries";
import { canAccessFinanzas } from "@/lib/utils";
import { FinanzasClient } from "./finanzas-client";

export default async function FinanzasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, occupancyType: true },
  });
  if (!dbUser || !canAccessFinanzas(dbUser)) redirect("/");

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
