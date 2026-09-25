import type { NextAuthConfig } from "next-auth";
import { canAccessRoute, type Role } from "@/lib/permissions/roles";

function isWithinOfficeHours(): boolean {
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const totalMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
  const start = 9 * 60 + 50; // 9:50 AM
  const end = 19 * 60; // 7:00 PM
  return totalMinutes >= start && totalMinutes < end;
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isProtected = path.startsWith("/dashboard") || path.startsWith("/portal");
      if (!isProtected) return true;
      if (!isLoggedIn) return false;
      if (!auth.user.active) return false;
      const role = auth.user.role as Role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN" && !isWithinOfficeHours()) return false;
      return canAccessRoute(role, path, auth.user.extraModules ?? []);
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.active = user.active;
        token.isSME = user.isSME ?? false;
        token.extraModules = user.extraModules ?? [];
      }
      if (trigger === "update" && session) {
        Object.assign(token, session);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.active = token.active as boolean;
        session.user.isSME = token.isSME as boolean | undefined;
        session.user.impersonating = token.impersonating as boolean | undefined;
        session.user.originalUserId = token.originalUserId as string | undefined;
        session.user.originalUserName = token.originalUserName as string | undefined;
        session.user.extraModules = token.extraModules as string[] | undefined;
      }
      return session;
    },
  },
  providers: [],
};
