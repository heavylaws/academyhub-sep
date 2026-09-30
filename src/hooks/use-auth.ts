import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase.ts";
import { firebaseAuthService } from "@/services/firebase-auth-service.ts";
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    const unsubFirebase = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setIsLoading(false);
    });

    const unsubMock = localMockStore.subscribeAuth(() => {
      setAuthTick((t) => t + 1);
    });

    return () => {
      unsubFirebase();
      unsubMock();
    };
  }, []);

  void authTick;

  const mockUser = localMockStore.getCurrentUser();
  const mockIsAuth = localMockStore.isAuthenticated();

  const isEmailUnverified = Boolean(firebaseUser && !firebaseUser.emailVerified);
  const isAuthenticated = Boolean(
    (firebaseUser && firebaseUser.emailVerified) || (!firebaseUser && mockIsAuth && mockUser),
  );

  const signinWithPassword = useCallback(
    async (email: string, password: string) => {
      try {
        const u = await firebaseAuthService.signIn(email, password);
        return u;
      } catch (fbErr) {
        // Fallback to local mock store if in offline test mode
        const res = localMockStore.authenticateWithPassword(email, password);
        if (res.success) {
          return res.user;
        }
        throw fbErr;
      }
    },
    [],
  );

  const signout = useCallback(async () => {
    try {
      await firebaseAuthService.signOut();
    } catch {
      // Ignored
    }
    localMockStore.setPersona(null);
  }, []);

  const effectiveEmail = firebaseUser?.email || mockUser?.email;
  const effectiveName = firebaseUser?.displayName || mockUser?.name || effectiveEmail?.split("@")[0];
  const effectiveId = firebaseUser?.uid || mockUser?._id;

  return {
    isAuthenticated,
    isEmailUnverified,
    isLoading,
    error: null as Error | null,
    user: (firebaseUser || mockUser)
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
