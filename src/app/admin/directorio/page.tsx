import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProviders } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { DirectorioClient } from "@/app/directorio/directorio-client";

export default async function AdminDirectorioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const providers = await getProviders();

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
        <AdminBackLink />
      </div>
      <DirectorioClient isAdmin providers={providers} />
    </div>
  );
}
