import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export type UserRole =
  | "platform_admin"
  | "academy_admin"
  | "coach"
  | "athlete"
  | "accounting"
  | "guardian";

/** Current signed-in user's Hercules Database row, or undefined while loading, or null if signed out/not synced yet. */
export function useCurrentUser() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  return {
    user: isAuthenticated ? user : null,
    isLoading: isAuthenticated && user === undefined,
  };
}
