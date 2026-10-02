import React, { useEffect, useState, useCallback, useRef } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { auth } from "@/lib/firebase.ts";
import {
  firebaseAuthService,
  type MembershipResolution,
} from "@/services/firebase-auth-service.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { AuthContext } from "./auth-context.ts";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { signOut: convexSignOut } = useAuthActions();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isResolvingMembership, setIsResolvingMembership] = useState(false);
  const [membership, setMembership] = useState<MembershipResolution | null>(null);
  const [devBypassed, setDevBypassed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("coachtactics_email_bypassed") === "true";
    } catch {
      return false;
    }
  });
  const previousUidRef = useRef<string | null>(auth.currentUser?.uid ?? null);

  const resolveAndSync = useCallback(
    async (user: FirebaseUser | null, bypass = false) => {
      if (!user) {
        setMembership(null);
        return;
      }

      const isUserPlatformAdmin = Boolean(
        user.email &&
          ["ah.baalbaki@gmail.com", "ahbaalbaki@gmail.com", "heavylaws@gmail.com"].includes(
            user.email.toLowerCase().trim(),
          ),
      );
      const shouldBypass = true;

      setIsResolvingMembership(true);
      try {
        const res = await firebaseAuthService.resolveUserMembership(user, shouldBypass);
        setMembership(res);

        if (res.status === "active" && res.role) {
          const targetAcademyId = res.academyId || localMockStore.getActiveAcademyId() || "acad_hercules";
          localMockStore.setCurrentUser({
            _id: user.uid,
            name: user.displayName || user.email?.split("@")[0] || "User",
            email: user.email || "",
            role: res.role,
            academyId: targetAcademyId,
          });
        } else if (res.status === "pending_access") {
          localMockStore.setCurrentUser({
            _id: user.uid,
            name: user.displayName || user.email?.split("@")[0] || "User",
            email: user.email || "",
            role: undefined,
            academyId: undefined,
          });
        }
      } catch (err) {
        console.error("Failed to resolve user membership:", err);
      } finally {
        setIsResolvingMembership(false);
      }
    },
    [],
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const currentUid = user?.uid ?? null;
      if (currentUid !== previousUidRef.current) {
        previousUidRef.current = currentUid;
        // Wipe local store completely whenever Firebase uid changes before loading new user data
        localMockStore.wipe();
      }
      setFirebaseUser(user);
      void resolveAndSync(user);
    });

    return () => unsub();
  }, [resolveAndSync]);

  const refreshMembership = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser(auth.currentUser);
      await resolveAndSync(auth.currentUser);
    }
  }, [resolveAndSync]);

  const bypassEmailVerification = useCallback(() => {
    try {
      localStorage.setItem("coachtactics_email_bypassed", "true");
    } catch {
      // Ignored
    }
    setDevBypassed(true);
    if (auth.currentUser) {
      void resolveAndSync(auth.currentUser, true);
    }
  }, [resolveAndSync]);

  const signInWithGoogle = useCallback(async () => {
    const user = await firebaseAuthService.signInWithGoogle();
    setFirebaseUser(user);
    await resolveAndSync(user);
  }, [resolveAndSync]);

  const handleSignOut = useCallback(async () => {
    previousUidRef.current = null;
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
    setDevBypassed(false);
    localMockStore.setPersona(null);
    localMockStore.wipe();
    try {
      await firebaseAuthService.signOut();
    } catch {
      // Ignored
    }
    setFirebaseUser(null);
    setMembership(null);
  }, [convexSignOut]);

  const isPlatformAdmin = Boolean(
    firebaseUser?.email &&
      ["ah.baalbaki@gmail.com", "ahbaalbaki@gmail.com", "heavylaws@gmail.com"].includes(
        firebaseUser.email.toLowerCase().trim(),
      ),
  );

  const isEmailUnverified = false;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        isEmailUnverified,
        isResolvingMembership,
        membership,
        refreshMembership,
        signOut: handleSignOut,
        bypassEmailVerification,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
