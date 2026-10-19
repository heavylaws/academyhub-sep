import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { isLocalDev } from "@/lib/env.ts";

export type UserRole =
  | "platform_admin"
  | "academy_admin"
  | "sporting_director"
  | "medical_staff"
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
  staffCompliance?: {
    coachingLicenseLevel?: string;
    licenseExpiryDate?: number;
    safeguardingVerified: boolean;
    safeguardingExpiryDate?: number;
    medicalCertification?: string;
  };
}

const ENABLE_MOCK = Boolean(
  !import.meta.env.PROD &&
    isLocalDev &&
    (import.meta.env.VITE_ENABLE_MOCK === "true" || !import.meta.env.VITE_CONVEX_URL),
);

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

  // 2. Fallback to localMockStore user only when ENABLE_MOCK is explicitly true
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
    isLoading: convexLoading,
  };
}
