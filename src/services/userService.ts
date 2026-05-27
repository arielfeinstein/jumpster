import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

/** Profile fields exposed to the client. Intentionally excludes the internal Supabase UUID. */
export type User = { username: string; email: string };

/**
 * Returns the profile of the authenticated user by their Supabase auth ID.
 * Throws NotFoundError if the auth user exists but has no corresponding User row —
 * which would indicate a failed registration that wasn't cleaned up.
 */
export async function getMe(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, email: true },
  });
  if (!user) throw new NotFoundError("User not found");
  return user;
}
