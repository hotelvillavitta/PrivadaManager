import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProviders } from "@/lib/queries";
import { DirectorioClient } from "./directorio-client";

export default async function DirectorioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const providers = await getProviders();

  return <DirectorioClient isAdmin={false} providers={providers} />;
}
