import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getResidentsAdmin } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { ResidentsAdmin } from "../residents-admin";

export default async function AdminResidentesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const residentsRaw = await getResidentsAdmin(session.user.email);
  const residents = [...residentsRaw].sort((a, b) => {
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
        description="Por casa: contacto principal visible; secundarios al expandir. Alta con propietario/inquilino y claves de acceso."
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
              gateCode: u.gateCode,
              role: u.role,
              occupancyType: u.occupancyType,
              isPrimary: u.isPrimary,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
