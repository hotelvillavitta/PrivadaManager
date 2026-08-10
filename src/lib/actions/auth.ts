"use server";

import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
