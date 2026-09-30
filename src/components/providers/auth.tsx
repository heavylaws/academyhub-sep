import React, { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase.ts";
import {
  firebaseAuthService,
  type MembershipResolution,
} from "@/services/firebase-auth-service.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { AuthContext } from "./auth-context.ts";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isResolvingMembership, setIsResolvingMembership] = useState(false);
  const [membership, setMembership] = useState<MembershipResolution | null>(null);

  const resolveAndSync = useCallback(async (user: FirebaseUser | null) => {
    if (!user) {
      setMembership(null);
      return;
    }

    if (!user.emailVerified) {
      setMembership({
        status: "unverified",
        role: null,
        academyId: null,
      });
      return;
    }

    setIsResolvingMembership(true);
    try {
      const res = await firebaseAuthService.resolveUserMembership(user);
      setMembership(res);

      if (res.status === "active" && res.role) {
        localMockStore.setCurrentUser({
          _id: user.uid,
          name: user.displayName || user.email?.split("@")[0] || "User",
          email: user.email || "",
          role: res.role,
          academyId: res.academyId || localMockStore.getActiveAcademyId() || "acad_heavylaws",
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
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
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

  const handleSignOut = useCallback(async () => {
    await firebaseAuthService.signOut();
    setFirebaseUser(null);
    setMembership(null);
    localMockStore.setPersona(null);
  }, []);

  const isEmailUnverified = Boolean(firebaseUser && !firebaseUser.emailVerified);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        isEmailUnverified,
        isResolvingMembership,
        membership,
        refreshMembership,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
