import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/utils";

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }
  return session.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Sin permisos de administrador");
  }
  return user;
}
