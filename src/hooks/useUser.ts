import { useContext } from "react";
import { UserContext } from "@/contexts/UserContext";

/** Returns the current user, a setter, and a loading flag. Must be used inside UserProvider. */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
