import type { NextApiRequest } from "next";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Extracts the Bearer token from the Authorization header, verifies it with
 * Supabase, and returns the authenticated user — or null if missing/invalid.
 */
export async function getAuthUser(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  const [scheme, token] = authHeader?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) return null;
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}
