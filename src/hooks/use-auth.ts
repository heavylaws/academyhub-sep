import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useAuthActions } from "@convex-dev/auth/react";
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
  const { signOut: convexSignOut } = useAuthActions();
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

  const isPlatformAdmin = Boolean(
    firebaseUser?.email &&
      ["ah.baalbaki@gmail.com", "heavylaws@gmail.com"].includes(
        firebaseUser.email.toLowerCase().trim(),
      ),
  );
  const isBypassed =
    typeof window !== "undefined" &&
    localStorage.getItem("coachtactics_email_bypassed") === "true";

  const isEmailUnverified = Boolean(
    firebaseUser && !firebaseUser.emailVerified && !isPlatformAdmin && !isBypassed,
  );
  const isAuthenticated = Boolean(
    firebaseUser && (firebaseUser.emailVerified || isPlatformAdmin || isBypassed),
  );

  const signinWithPassword = useCallback(
    async (email: string, password: string) => {
      const u = await firebaseAuthService.signIn(email, password);
      return u;
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
    try {
      await firebaseAuthService.signOut();
    } catch {
      // Ignored
    }
  }, [convexSignOut]);

  const effectiveEmail = firebaseUser?.email || undefined;
  const effectiveName = firebaseUser?.displayName || effectiveEmail?.split("@")[0];
  const effectiveId = firebaseUser?.uid;

  return {
    isAuthenticated,
    isEmailUnverified,
    isLoading,
    error: null as Error | null,
    user: firebaseUser
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
