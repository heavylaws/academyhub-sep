import { useCallback } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { localMockConvexClient } from "@/lib/local-mock-convex-client.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { isLocalDev } from "@/lib/env.ts";

const rawConvexUrl = import.meta.env.VITE_CONVEX_URL?.trim();

function getValidConvexUrl(url?: string): string {
  if (!url) return "https://placeholder.convex.cloud";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // invalid URL format fallback
  }
  return "https://placeholder.convex.cloud";
}

let liveConvex: ConvexReactClient | null = null;
function getLiveConvexClient(): ConvexReactClient {
  if (!liveConvex) {
    liveConvex = new ConvexReactClient(getValidConvexUrl(rawConvexUrl));
  }
  return liveConvex;
}

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
    <ConvexAuthProvider client={getLiveConvexClient()}>{children}</ConvexAuthProvider>
  );
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (isLocalDev) {
    return <LocalConvexProvider>{children}</LocalConvexProvider>;
  }
  return <LiveConvexProvider>{children}</LiveConvexProvider>;
}
