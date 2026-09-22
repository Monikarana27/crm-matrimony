import { encode, decode } from "next-auth/jwt";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_NAME = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";
const MAX_AGE = 8 * 60 * 60; // matches auth.config.ts session.maxAge

export async function getCurrentToken() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!rawToken) return null;

  return decode({
    token: rawToken,
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE_NAME,
  });
}

export async function setSessionToken(payload: Record<string, unknown>) {
  const encoded = await encode({
    token: payload,
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE_NAME,
    maxAge: MAX_AGE,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProd,
    maxAge: MAX_AGE,
  });
}