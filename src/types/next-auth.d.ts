import type { OccupancyType, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    firstName: string;
    lastName: string;
    houseNumber: string | null;
    accessCode: string | null;
    gateCode: string | null;
    occupancyType: OccupancyType;
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
      gateCode: string | null;
      occupancyType: OccupancyType;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    firstName?: string;
    lastName?: string;
    houseNumber?: string | null;
    accessCode?: string | null;
    gateCode?: string | null;
    occupancyType?: OccupancyType;
  }
}
