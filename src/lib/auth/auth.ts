import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validations/auth.schema";
import { authConfig } from "@/lib/auth/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) return null;

        await prisma.loginEvent.create({ data: { userId: user.id } }).catch(() => {});

        const extraGrants = await prisma.employeePermission.findMany({
          where: { userId: user.id },
          include: { permission: { select: { module: true } } },
        });
        const extraModules = Array.from(new Set(extraGrants.map((g) => g.permission.module)));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          isSME: user.isSME,
          extraModules,
        };
      },
    }),
  ],
});
