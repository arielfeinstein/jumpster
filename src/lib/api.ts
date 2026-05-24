import { supabase } from "@/lib/supabase";

/**
 * Authenticated fetch wrapper for all client-side API calls.
 * Automatically injects the current user's Supabase JWT as a Bearer token
 * and sets Content-Type to JSON so callers don't have to repeat that boilerplate.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...options.headers,
    },
  });
}
