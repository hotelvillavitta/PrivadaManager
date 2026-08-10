import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    firstName: string;
    lastName: string;
    houseNumber: string | null;
    accessCode: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      firstName: string;
      lastName: string;
      houseNumber: string | null;
      accessCode: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    firstName: string;
    lastName: string;
    houseNumber: string | null;
    accessCode: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          houseNumber: user.houseNumber,
          accessCode: user.accessCode,
        };
      },
    }),
  ],
});
