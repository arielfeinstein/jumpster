import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Uses the anon key, which is safe to expose
// publicly — it only grants access allowed by Row Level Security policies.
// Uses createBrowserClient (from @supabase/ssr) instead of createClient so
// the session is stored in a cookie rather than localStorage — required for
// the middleware to see the session and allow access to protected pages.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Returns the username of the currently authenticated user, or null if not signed in. */
export async function getCurrentUsername(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.user_metadata.username ?? null;
}
