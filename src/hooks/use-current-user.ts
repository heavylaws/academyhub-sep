import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useFirebaseAuth } from "@/components/providers/auth-context.ts";

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

/** Current signed-in user's profile and academy role. */
export function useCurrentUser(): { user: CurrentUser | null | undefined; isLoading: boolean } {
  const { firebaseUser, isResolvingMembership, membership } = useFirebaseAuth();
  const { isAuthenticated: convexIsAuth } = useConvexAuth();
  const convexUser = useQuery(
    api.users.getCurrentUser,
    convexIsAuth ? {} : "skip",
  );

  // If Firebase user is present
  if (firebaseUser) {
    if (!firebaseUser.emailVerified) {
      return {
        user: {
          _id: firebaseUser.uid as Id<"users">,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
          email: firebaseUser.email || undefined,
          emailVerified: false,
          role: undefined,
          academyId: undefined,
        },
        isLoading: false,
      };
    }

    if (isResolvingMembership) {
      return {
        user: undefined,
        isLoading: true,
      };
    }

    return {
      user: {
        _id: firebaseUser.uid as Id<"users">,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
        email: firebaseUser.email || undefined,
        role: membership?.role || undefined,
        academyId: (membership?.academyId || undefined) as Id<"academies"> | undefined,
        emailVerified: true,
      },
      isLoading: false,
    };
  }

  // Fallback to Convex user if authenticated
  if (convexIsAuth && convexUser) {
    return {
      user: convexUser as unknown as CurrentUser,
      isLoading: false,
    };
  }

  return {
    user: null,
    isLoading: false,
  };
}
