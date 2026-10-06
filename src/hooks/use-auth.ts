import { useState, useEffect, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { localMockStore } from "@/lib/local-mock-store.ts";

export interface LocalAuthUser {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  isAuthenticated: boolean;
  isEmailUnverified?: boolean;
  isLoading: boolean;
  error: Error | null;
  profile?: {
    sub?: string;
    name?: string;
    email?: string;
  };
}

export function useAuth() {
  const { signOut: convexSignOut } = useAuthActions();
  const { isAuthenticated: convexIsAuth, isLoading: convexLoading } = useConvexAuth();
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    const unsubMock = localMockStore.subscribeAuth(() => {
      setAuthTick((t) => t + 1);
    });

    return () => {
      unsubMock();
    };
  }, []);

  void authTick;

  const mockUser = localMockStore.getCurrentUser();
  const isAuthenticated = convexIsAuth || Boolean(mockUser);
  const isLoading = convexLoading;

  const signinWithPassword = useCallback(
    async (email: string, pass: string) => {
      const res = localMockStore.authenticateWithPassword(email, pass);
      if (res.success && res.user) {
        return res.user;
      }
      throw new Error(res.error || "Authentication failed");
    },
    [],
  );

  const signout = useCallback(async () => {
    try {
      await convexSignOut();
    } catch (e) {
      console.warn("Convex signout error:", e);
    }
    try {
      localStorage.removeItem("coachtactics_email_bypassed");
      localStorage.removeItem("coachtactics_persona_id_v3");
      localStorage.removeItem("coachtactics_auth_user");
      localStorage.removeItem("coachtactics_active_academy_id");
      sessionStorage.clear();
    } catch {
      // Ignored
    }
    localMockStore.setPersona(null);
    localMockStore.wipe();
  }, [convexSignOut]);

  const effectiveEmail = mockUser?.email || undefined;
  const effectiveName = mockUser?.name || effectiveEmail?.split("@")[0] || "Coach";
  const effectiveId = mockUser?._id;

  return {
    isAuthenticated,
    isEmailUnverified: false,
    isLoading,
    error: null as Error | null,
    user: isAuthenticated
      ? {
          profile: {
            sub: effectiveId,
            name: effectiveName,
            email: effectiveEmail,
          },
        }
      : null,
    signin: async () => {},
    signinWithPassword,
    signout,
    signinRedirect: async () => {},
    signoutRedirect: signout,
    removeUser: signout,
  };
}

export function useUser(): LocalAuthUser {
  const { user, isAuthenticated, isEmailUnverified, isLoading, error } = useAuth();
  return {
    id: user?.profile?.sub,
    name: user?.profile?.name,
    email: user?.profile?.email,
    isAuthenticated,
    isEmailUnverified,
    isLoading,
    error,
    profile: user?.profile,
  };
}
