import { getFunctionName } from "convex/server";
import { localMockStore } from "./local-mock-store.ts";

export function resolveFunctionName(funcRef: unknown): string {
  if (typeof funcRef === "string") return funcRef;
  try {
    return getFunctionName(funcRef as Parameters<typeof getFunctionName>[0]);
  } catch {
    if (funcRef && typeof funcRef === "object") {
      const sym = Symbol.for("functionName");
      if (
        sym in funcRef &&
        typeof (funcRef as Record<symbol, unknown>)[sym] === "string"
      ) {
        return (funcRef as Record<symbol, unknown>)[sym] as string;
      }
    }
    return String(funcRef);
  }
}

export interface MockWatch<T> {
  onUpdate: (callback: () => void) => () => void;
  localQueryResult: () => T;
  localQueryLogs: () => undefined;
  journal: () => undefined;
}

export class LocalMockConvexClient {
  private authChangeCallback?: (isAuthenticated: boolean) => void;

  constructor() {
    localMockStore.subscribeAuth(() => {
      this.authChangeCallback?.(localMockStore.isAuthenticated());
    });
  }

  public watchQuery(
    query: unknown,
    args: Record<string, unknown> = {},
  ): MockWatch<unknown> {
    const name = resolveFunctionName(query);
    return {
      onUpdate: (callback: () => void) => {
        return localMockStore.subscribe(callback);
      },
      localQueryResult: () => {
        return localMockStore.evaluateQuery(name, args);
      },
      localQueryLogs: () => undefined,
      journal: () => undefined,
    };
  }

  public watchPaginatedQuery(
    query: unknown,
    args: Record<string, unknown> = {},
  ): {
    onUpdate: (callback: () => void) => () => void;
    localQueryResult: () => unknown;
  } {
    const name = resolveFunctionName(query);
    return {
      onUpdate: (callback: () => void) => {
        return localMockStore.subscribe(callback);
      },
      localQueryResult: () => {
        return localMockStore.evaluateQuery(name, args);
      },
    };
  }

  public async mutation(
    mutation: unknown,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const name = resolveFunctionName(mutation);
    return await localMockStore.executeMutation(name, args);
  }

  public async action(
    action: unknown,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const name = resolveFunctionName(action);
    return await localMockStore.executeMutation(name, args);
  }

  public async query(
    query: unknown,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const name = resolveFunctionName(query);
    return localMockStore.evaluateQuery(name, args);
  }

  public setAuth(
    _fetchToken: unknown,
    onChange?: (isAuthenticated: boolean) => void,
  ): void {
    this.authChangeCallback = onChange;
    onChange?.(localMockStore.isAuthenticated());
  }

  public clearAuth(): void {
    this.authChangeCallback?.(false);
  }

  public connectionState(): {
    hasInflightRequests: boolean;
    isWebSocketConnected: boolean;
  } {
    return {
      hasInflightRequests: false,
      isWebSocketConnected: true,
    };
  }

  public subscribeToConnectionState(_cb: (state: unknown) => void): () => void {
    return () => {};
  }
}

export const localMockConvexClient = /* @__PURE__ */ new LocalMockConvexClient();
