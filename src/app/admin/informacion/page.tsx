import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getPrivada } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { InformacionAdminClient } from "./informacion-admin-client";

export default async function AdminInformacionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const privada = await getPrivada();

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Información de la privada"
        description="Edita contacto, capacidad, horarios y reglamento del área común."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 lg:px-6">
        <AdminBackLink />
        <InformacionAdminClient privada={privada} />
      </div>
    </div>
  );
}
