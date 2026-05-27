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

