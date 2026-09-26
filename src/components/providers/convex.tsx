import { useCallback } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { localMockConvexClient } from "@/lib/local-mock-convex-client.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { isLocalDev } from "@/lib/env.ts";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3000";
const liveConvex = new ConvexReactClient(convexUrl);

function LocalConvexProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const mockUseAuth = useCallback(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken: async () => (isAuthenticated ? "mock-token" : null),
    }),
    [isLoading, isAuthenticated],
  );

  return (
    <ConvexProviderWithAuth
      client={localMockConvexClient as unknown as ConvexReactClient}
      useAuth={mockUseAuth}
    >
      {children}
    </ConvexProviderWithAuth>
  );
}

function LiveConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={liveConvex}>{children}</ConvexAuthProvider>
  );
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (isLocalDev) {
    return <LocalConvexProvider>{children}</LocalConvexProvider>;
  }
  return <LiveConvexProvider>{children}</LiveConvexProvider>;
}
