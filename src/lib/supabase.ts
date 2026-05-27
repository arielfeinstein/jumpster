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

export interface CurrentUser {
  username: string;
  email: string;
}

/** Returns the username and email of the currently authenticated user, or null if not signed in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return {
    username: session.user.user_metadata.username,
    email: session.user.email!,
  };
}
