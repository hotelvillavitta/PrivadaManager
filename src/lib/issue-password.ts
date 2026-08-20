import "server-only";
import { headers } from "next/headers";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { getPrivada } from "@/lib/queries";
import {
  createResetToken,
  generateTemporaryPassword,
} from "@/lib/passwords";
import { sendTemporaryPasswordEmail } from "@/lib/notify/password-mail";

export async function appBaseUrl() {
  const env = process.env.AUTH_URL?.trim() || process.env.APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function issueTemporaryPassword(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Residente no encontrado." } as const;

  const password = generateTemporaryPassword();
  const reset = createResetToken();
  const privada = await getPrivada();
  const resetUrl = `${await appBaseUrl()}/cambiar-contrasena?token=${reset.token}`;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(password, 10),
      mustChangePassword: true,
      passwordResetToken: reset.hash,
      passwordResetExpires: reset.expires,
    },
  });

  const mailed = await sendTemporaryPasswordEmail({
    to: user.email,
    name: user.firstName,
    privadaName: privada.name,
    password,
    resetUrl,
  });

  return {
    ok: true as const,
    temporaryPassword: password,
    emailed: mailed.ok,
    emailError: mailed.ok ? undefined : mailed.error,
  };
}
