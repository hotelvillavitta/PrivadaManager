import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getPrivada } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { PersonalizacionAdminClient } from "./personalizacion-admin-client";

export default async function AdminPersonalizacionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const privada = await getPrivada();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Personalización"
        description="Configura el logo, colores y nombre exclusivos de tu privada."
      />
      <div className="mx-auto max-w-5xl space-y-4 px-4 lg:px-6">
        <AdminBackLink />
        <PersonalizacionAdminClient privada={privada} origin={origin} />
      </div>
    </div>
  );
}
