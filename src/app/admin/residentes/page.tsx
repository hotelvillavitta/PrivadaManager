import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { ResidentsAdmin } from "../residents-admin";

export default async function AdminResidentesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const data = await getAdminDashboard();
  const residents = [...data.residents].sort((a, b) => {
    const na = Number(a.houseNumber);
    const nb = Number(b.houseNumber);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return (a.houseNumber ?? "").localeCompare(b.houseNumber ?? "", "es");
  });

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Residentes y casas"
        description="Listado ordenado por casa. Alta de usuarios, claves de acceso y contraseñas iniciales."
      />
      <div className="mx-auto max-w-4xl space-y-4 px-4 lg:px-6">
        <AdminBackLink />
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <ResidentsAdmin
            currentUserId={session.user.id}
            residents={residents.map((u) => ({
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              houseNumber: u.houseNumber,
              accessCode: u.accessCode,
              role: u.role,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
