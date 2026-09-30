import { createContext, useContext } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { MembershipResolution } from "@/services/firebase-auth-service.ts";

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  isEmailUnverified: boolean;
  isResolvingMembership: boolean;
  membership: MembershipResolution | null;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  isEmailUnverified: false,
  isResolvingMembership: false,
  membership: null,
  refreshMembership: async () => {},
  signOut: async () => {},
});

export function useFirebaseAuth() {
  return useContext(AuthContext);
}
