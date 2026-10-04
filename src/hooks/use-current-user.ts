import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useFirebaseAuth } from "@/components/providers/auth-context.ts";
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

/** Current signed-in user's profile and academy role. */
export function useCurrentUser(): { user: CurrentUser | null | undefined; isLoading: boolean } {
  const { firebaseUser, isEmailUnverified, isResolvingMembership, membership } =
    useFirebaseAuth();
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

  // 2. Authoritative Firebase user if present
  if (firebaseUser) {
    if (isEmailUnverified) {
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

    // Server-verified membership role
    const effectiveRole = membership?.role || undefined;
    const effectiveAcademyId = membership?.academyId || undefined;
    const effectiveName = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
    const effectiveEmail = firebaseUser.email || undefined;

    return {
      user: {
        _id: firebaseUser.uid as Id<"users">,
        name: effectiveName,
        email: effectiveEmail,
        role: effectiveRole,
        academyId: effectiveAcademyId as Id<"academies"> | undefined,
        emailVerified: true,
      },
      isLoading: false,
    };
  }

  // 3. Fallback to localMockStore user only when not authenticated via cloud providers
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
