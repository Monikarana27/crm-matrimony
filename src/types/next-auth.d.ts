import { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    active: boolean;
    accountType?: "staff" | "client";
    profileId?: string;
    extraModules?: string[];
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      active: boolean;
      impersonating?: boolean;
      originalUserId?: string;
      originalUserName?: string;
      accountType?: "staff" | "client";
      profileId?: string;
      extraModules?: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    active: boolean;
    impersonating?: boolean;
    originalUserId?: string;
    originalUserName?: string;
    accountType?: "staff" | "client";
    profileId?: string;
    extraModules?: string[];
  }
}
