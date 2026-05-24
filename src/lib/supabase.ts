import { createClient } from "@supabase/supabase-js";

// Browser-side Supabase client. Uses the anon key, which is safe to expose
// publicly — it only grants access allowed by Row Level Security policies.
// Import this in React components and client-side code.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
