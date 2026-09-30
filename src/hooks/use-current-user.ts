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

    const mockUser = localMockStore.getCurrentUser();
    const effectiveRole = (membership?.role || mockUser?.role) as UserRole | undefined;
    const effectiveAcademyId = (membership?.academyId || mockUser?.academyId) as Id<"academies"> | undefined;

    return {
      user: {
        _id: firebaseUser.uid as Id<"users">,
        name: firebaseUser.displayName || mockUser?.name || firebaseUser.email?.split("@")[0],
        email: firebaseUser.email || undefined,
        role: effectiveRole,
        academyId: effectiveAcademyId,
        emailVerified: true,
      },
      isLoading: false,
    };
  }

  // Fallback to Convex / Mock store user (e.g. for vitest test runs or local testing)
  if (convexIsAuth && convexUser) {
    return {
      user: convexUser as unknown as CurrentUser,
      isLoading: false,
    };
  }

  const mock = localMockStore.getCurrentUser();
  if (mock) {
    return {
      user: mock as unknown as CurrentUser,
      isLoading: false,
    };
  }

  return {
    user: null,
    isLoading: false,
  };
}
