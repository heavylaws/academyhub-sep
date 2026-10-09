import { useState, useEffect } from "react";
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

const ENABLE_MOCK =
  import.meta.env.DEV &&
  (import.meta.env.VITE_ENABLE_MOCK === "true" ||
    import.meta.env.VITE_LOCAL_DEV === "true");

/** Current signed-in user's profile and academy role from Convex Auth or Local Mock. */
export function useCurrentUser(): { user: CurrentUser | null | undefined; isLoading: boolean } {
  const { isAuthenticated: convexIsAuth, isLoading: convexLoading } = useConvexAuth();
  const convexUser = useQuery(
    api.users.getCurrentUser,
    convexIsAuth ? {} : "skip",
  );

  const [localUser, setLocalUser] = useState(() =>
    ENABLE_MOCK ? localMockStore.getCurrentUser() : null,
  );

  useEffect(() => {
    if (!ENABLE_MOCK) return;
    setLocalUser(localMockStore.getCurrentUser());
    const unsub = localMockStore.subscribeAuth(() => {
      setLocalUser(localMockStore.getCurrentUser());
    });
    return unsub;
  }, []);

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
  if (ENABLE_MOCK && localUser) {
    return {
      user: {
        ...localUser,
        emailVerified: true,
      } as unknown as CurrentUser,
      isLoading: false,
    };
  }

  return {
    user: null,
    isLoading: convexLoading && !(ENABLE_MOCK && localUser),
  };
}
