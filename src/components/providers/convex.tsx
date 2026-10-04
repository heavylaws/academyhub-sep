import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { resolveFunctionName } from "@/lib/local-mock-convex-client.ts";

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

let wrappedConvexClient: ConvexReactClient | null = null;

// eslint-disable-next-line react-refresh/only-export-components
export function getLiveConvexClient(): ConvexReactClient {
  if (!wrappedConvexClient) {
    const baseClient = new ConvexReactClient(getValidConvexUrl(rawConvexUrl));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalWatchQuery = (baseClient as any).watchQuery.bind(baseClient);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalMutation = (baseClient as any).mutation.bind(baseClient);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalQuery = (baseClient as any).query.bind(baseClient);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalAction = (baseClient as any).action.bind(baseClient);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseClient as any).watchQuery = (query: any, ...argsAndOptions: any[]) => {
      const name = resolveFunctionName(query);
      const realWatch = originalWatchQuery(query, ...argsAndOptions);
      const args = (argsAndOptions[0] || {}) as Record<string, unknown>;
      let isFallback = false;

      return {
        onUpdate: (callback: () => void) => {
          const unsubReal = realWatch.onUpdate(() => {
            callback();
          });
          const unsubMock = localMockStore.subscribe(() => {
            if (isFallback) {
              callback();
            }
          });
          return () => {
            unsubReal();
            unsubMock();
          };
        },
        localQueryResult: () => {
          try {
            const res = realWatch.localQueryResult();
            isFallback = false;
            return res;
          } catch (err: unknown) {
            const msg = String((err as { message?: string })?.message || err || "");
            if (
              msg.includes("Could not find public function") ||
              msg.includes("Server Error")
            ) {
              isFallback = true;
              return localMockStore.evaluateQuery(name, args);
            }
            throw err;
          }
        },
        localQueryLogs: () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (realWatch as any).localQueryLogs?.();
          } catch {
            return undefined;
          }
        },
        journal: () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (realWatch as any).journal?.();
          } catch {
            return undefined;
          }
        },
      };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseClient as any).mutation = async (mutation: any, ...argsAndOptions: any[]) => {
      try {
        return await originalMutation(mutation, ...argsAndOptions);
      } catch (err: unknown) {
        const msg = String((err as { message?: string })?.message || err || "");
        if (
          msg.includes("Could not find public function") ||
          msg.includes("Server Error")
        ) {
          const name = resolveFunctionName(mutation);
          const args = (argsAndOptions[0] || {}) as Record<string, unknown>;
          return await localMockStore.executeMutation(name, args);
        }
        throw err;
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseClient as any).query = async (query: any, ...argsAndOptions: any[]) => {
      try {
        return await originalQuery(query, ...argsAndOptions);
      } catch (err: unknown) {
        const msg = String((err as { message?: string })?.message || err || "");
        if (
          msg.includes("Could not find public function") ||
          msg.includes("Server Error")
        ) {
          const name = resolveFunctionName(query);
          const args = (argsAndOptions[0] || {}) as Record<string, unknown>;
          return localMockStore.evaluateQuery(name, args);
        }
        throw err;
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseClient as any).action = async (action: any, ...argsAndOptions: any[]) => {
      try {
        return await originalAction(action, ...argsAndOptions);
      } catch (err: unknown) {
        const msg = String((err as { message?: string })?.message || err || "");
        if (
          msg.includes("Could not find public function") ||
          msg.includes("Server Error")
        ) {
          const name = resolveFunctionName(action);
          const args = (argsAndOptions[0] || {}) as Record<string, unknown>;
          return await localMockStore.executeMutation(name, args);
        }
        throw err;
      }
    };

    wrappedConvexClient = baseClient;
  }
  return wrappedConvexClient;
}

export function LiveConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={getLiveConvexClient()}>{children}</ConvexAuthProvider>
  );
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return <LiveConvexProvider>{children}</LiveConvexProvider>;
}
