import { useCallback } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { localMockConvexClient } from "@/lib/local-mock-convex-client.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { isLocalDev } from "@/lib/env.ts";

const rawConvexUrl =
  import.meta.env.VITE_CONVEX_URL?.trim() ||
  "https://peaceful-cassowary-561.eu-west-1.convex.cloud";

function getValidConvexUrl(url?: string): string {
  if (!url) return "https://peaceful-cassowary-561.eu-west-1.convex.cloud";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // invalid URL format fallback
  }
  return "https://peaceful-cassowary-561.eu-west-1.convex.cloud";
}

let liveConvex: ConvexReactClient | null = null;
// eslint-disable-next-line react-refresh/only-export-components
export function getLiveConvexClient(): ConvexReactClient {
  if (!liveConvex) {
    liveConvex = new ConvexReactClient(getValidConvexUrl(rawConvexUrl));
  }
  return liveConvex;
}

export function LiveConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={getLiveConvexClient()}>{children}</ConvexAuthProvider>
  );
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return <LiveConvexProvider>{children}</LiveConvexProvider>;
}
