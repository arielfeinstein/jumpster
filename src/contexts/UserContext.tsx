import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import type { User } from "@/services/userService";

interface UserContextValue {
  /** The authenticated user's profile, or null if not signed in. */
  user: User | null;
  /** Manually override the stored user — useful when the profile is updated (e.g. username change). */
  setUser: (user: User | null) => void;
  /** True while the initial session check and profile fetch are in flight on app load. */
  loading: boolean;
}

/**
 * Holds the authenticated user's profile for the lifetime of the app.
 */
export const UserContext = createContext<UserContextValue | null>(null);

/**
 * Fetches the user profile once on login and keeps it in sync with Supabase
 * auth state. Wrap the app root with this so every component can call useUser()
 * instead of making independent API calls.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    const res = await apiFetch("/api/auth/me");
    if (!res.ok) { setUser(null); return; }
    setUser(await res.json());
  }

  useEffect(() => {
    // Populate on mount if a session already exists (e.g. page refresh).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchUser().finally(() => setLoading(false));
      else setLoading(false);
    });

    // Keep in sync with sign-in / sign-out events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") fetchUser();
      if (event === "SIGNED_OUT") setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}
