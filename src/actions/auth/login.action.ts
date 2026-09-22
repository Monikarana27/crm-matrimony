"use server";

import { signIn } from "@/lib/auth/auth";
import { loginSchema } from "@/lib/validations/auth.schema";
import { AuthError } from "next-auth";
import { signOut } from "@/lib/auth/auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function loginAction(_prevState: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  return { error: null };
}