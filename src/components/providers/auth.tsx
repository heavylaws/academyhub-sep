import React, { useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { AuthContext } from "./auth-context.ts";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { signOut: convexSignOut } = useAuthActions();

  const refreshMembership = useCallback(async () => {
    // Local mock & convex state refresh
  }, []);

  const handleSignOut = useCallback(async () => {
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

  return (
    <AuthContext.Provider
      value={{
        refreshMembership,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
