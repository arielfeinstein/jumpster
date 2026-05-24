import { createClient } from "@supabase/supabase-js";

// Server-only admin client. Uses the service role key, which bypasses all
// Row Level Security — never import this in browser/client code, only in
// API routes and other server-side modules.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
