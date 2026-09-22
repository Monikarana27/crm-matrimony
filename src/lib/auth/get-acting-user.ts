import { auth } from "@/lib/auth/auth";

type ActingSession = {
  user?: {
    id: string;
    impersonating?: boolean;
    originalUserId?: string;
  } | null;
};

/**
 * Returns the ID that should be recorded as the actor in ActivityLog.
 * If currently impersonating, returns the REAL admin's ID, not the
 * impersonated user's ID — so audit trails stay accurate.
 *
 * Pass an already-fetched `session` when the caller has one in scope
 * (most action files already call `await auth()` for other reasons)
 * to avoid a redundant auth() lookup. Falls back to fetching its own
 * session when none is passed.
 */
export async function getActingUserId(session?: ActingSession): Promise<string> {
  const resolved = session ?? (await auth());
  if (!resolved?.user) throw new Error("Unauthorized");
  return resolved.user.impersonating && resolved.user.originalUserId
    ? resolved.user.originalUserId
    : resolved.user.id;
}