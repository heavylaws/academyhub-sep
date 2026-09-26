import { useState, useEffect, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { isLocalDev } from "@/lib/env.ts";

export interface LocalAuthUser {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  profile?: {
    sub?: string;
    name?: string;
    email?: string;
  };
}

function useLocalAuth() {
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    return localMockStore.subscribeAuth(() => {
      setAuthTick((t) => t + 1);
    });
  }, []);

  void authTick;

  const currentUser = localMockStore.getCurrentUser();
  const isAuthenticated = localMockStore.isAuthenticated();

  const signin = useCallback(async () => {
    // Default to Super Admin Ahmad Baalbaki
    localMockStore.setPersona("usr_super_admin");
  }, []);

  const signinWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = localMockStore.authenticateWithPassword(email, password);
      if (!res.success) {
        throw new Error(res.error || "Authentication failed");
      }
      return res.user;
    },
    [],
  );

  const signout = useCallback(async () => {
    localMockStore.setPersona(null);
  }, []);

  return {
    isAuthenticated,
    isLoading: false,
    error: null as Error | null,
    user: currentUser
      ? {
          profile: {
            sub: currentUser.tokenIdentifier,
            name: currentUser.name,
            email: currentUser.email,
          },
        }
      : null,
    signin,
    signinWithPassword,
    signout,
    signinRedirect: signin,
    signoutRedirect: signout,
    removeUser: signout,
  };
}

function useLiveAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");

  // Sign-in happens on the landing page's email/password form.
  const signin = useCallback(async () => {
    window.location.assign("/");
  }, []);

  return {
    isAuthenticated,
    isLoading,
    error: null,
    user: user
      ? { profile: { sub: user._id, name: user.name, email: user.email } }
      : null,
    signin,
    signout: signOut,
    signinRedirect: signin,
    signoutRedirect: signOut,
    removeUser: signOut,
  };
}

export function useAuth() {
  if (isLocalDev) {
    // isLocalDev is constant for the lifetime of the process, satisfying rules of hooks
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useLocalAuth();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLiveAuth();
}

function useLocalUser(): LocalAuthUser {
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    return localMockStore.subscribeAuth(() => {
      setAuthTick((t) => t + 1);
    });
  }, []);

  void authTick;

  const currentUser = localMockStore.getCurrentUser();
  const isAuthenticated = localMockStore.isAuthenticated();

  return {
    id: currentUser?._id,
    name: currentUser?.name,
    email: currentUser?.email,
    isAuthenticated,
    isLoading: false,
    error: null,
    profile: currentUser
      ? {
          sub: currentUser.tokenIdentifier,
          name: currentUser.name,
          email: currentUser.email,
        }
      : undefined,
  };
}

function useLiveUser(): LocalAuthUser {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  return {
    id: user?._id,
    name: user?.name,
    email: user?.email,
    isAuthenticated,
    isLoading: isLoading || (isAuthenticated && user === undefined),
    error: null,
    profile: user
      ? { sub: user._id, name: user.name, email: user.email }
      : undefined,
  };
}

export function useUser(): LocalAuthUser {
  if (isLocalDev) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useLocalUser();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLiveUser();
}
