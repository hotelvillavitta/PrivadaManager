"use server";

import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPrivada } from "@/lib/queries";
import { createResetToken, hashResetToken } from "@/lib/passwords";
import { appBaseUrl } from "@/lib/issue-password";
import { sendPasswordResetEmail } from "@/lib/notify/password-mail";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa correo y contraseña." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos." };
    }
    throw error;
  }
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim();

  if (!email || !password || !firstName || !lastName || !houseNumber) {
    return { error: "Completa todos los campos." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "Ese correo ya está registrado." };
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hash(password, 10),
      firstName,
      lastName,
      houseNumber,
      role: "COLONO",
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada, pero no se pudo iniciar sesión." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Ingresa tu correo." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const reset = createResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: reset.hash,
        passwordResetExpires: reset.expires,
      },
    });
    const privada = await getPrivada();
    await sendPasswordResetEmail({
      to: user.email,
      name: user.firstName,
      privadaName: privada.name,
      resetUrl: `${await appBaseUrl()}/cambiar-contrasena?token=${reset.token}`,
    });
  }

  return {
    ok: true,
    message:
      "Si el correo está registrado, te enviamos un enlace para cambiar la contraseña.",
  };
}

export async function completePasswordReset(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "Enlace inválido o caducado." };
  if (password.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden." };
  }

  const tokenHash = hashResetToken(token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetExpires: { gt: new Date() },
    },
  });
  if (!user) {
    return { error: "El enlace ya no es válido. Solicita uno nuevo." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(password, 10),
      mustChangePassword: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return { ok: true };
}
