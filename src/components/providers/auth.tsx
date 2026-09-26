// Authentication is provided by ConvexAuthProvider (see ./convex.tsx) in live
// mode and by the local mock store in mock mode, so nothing is needed here.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
