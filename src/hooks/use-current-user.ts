import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";

export type UserRole =
  | "platform_admin"
  | "academy_admin"
  | "coach"
  | "athlete"
  | "accounting"
  | "guardian";

export interface CurrentUser {
  _id: Id<"users">;
  name?: string;
  email?: string;
  role?: UserRole;
  academyId?: Id<"academies">;
  academyName?: string;
  emailVerified?: boolean;
}

/** Current signed-in user's profile and academy role from Convex Auth or Local Mock. */
export function useCurrentUser(): { user: CurrentUser | null | undefined; isLoading: boolean } {
  const { isAuthenticated: convexIsAuth } = useConvexAuth();
  const convexUser = useQuery(
    api.users.getCurrentUser,
    convexIsAuth ? {} : "skip",
  );

  // 1. Authoritative Convex user if authenticated
  if (convexIsAuth) {
    if (convexUser === undefined) {
      return {
        user: undefined,
        isLoading: true,
      };
    }
    if (convexUser) {
      return {
        user: {
          ...convexUser,
          emailVerified: true,
        } as unknown as CurrentUser,
        isLoading: false,
      };
    }
  }

  // 2. Fallback to localMockStore user
  const localUser = localMockStore.getCurrentUser();
  if (localUser) {
    return {
      user: localUser as unknown as CurrentUser,
      isLoading: false,
    };
  }

  return {
    user: null,
    isLoading: false,
  };
}
