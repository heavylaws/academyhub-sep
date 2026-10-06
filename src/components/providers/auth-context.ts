import { createContext, useContext } from "react";

export interface AuthContextValue {
  signOut: () => Promise<void>;
  refreshMembership: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  signOut: async () => {},
  refreshMembership: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}
