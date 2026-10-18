import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { resolveFunctionName } from "@/lib/local-mock-convex-client.ts";
import { isEntityInAcademy, isForeignEntityText } from "@/lib/tenant-isolation.ts";
import { isLocalDev } from "@/lib/env.ts";

let activeTenantAcademyId: string | undefined = undefined;

function getActiveAcademyId(): string | undefined {
  if (activeTenantAcademyId) return activeTenantAcademyId;
  if (!import.meta.env.PROD && isLocalDev) {
    const mockId = localMockStore.getActiveAcademyId();
    if (mockId) return mockId;
  }
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("coachtactics_active_academy_id");
    if (saved && saved !== "undefined") return saved;
  }
  return !import.meta.env.PROD && isLocalDev ? "acad_hercules" : undefined;
}

const rawConvexUrl =
  import.meta.env.VITE_CONVEX_URL?.trim() ||
  "https://peaceful-cassowary-561.eu-west-1.convex.cloud";

function getValidConvexUrl(url?: string): string {
  if (!url) return "https://peaceful-cassowary-561.eu-west-1.convex.cloud";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url.trim().replace(/\/+$/, "");
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
          const unsubMock =
            !import.meta.env.PROD && isLocalDev
              ? localMockStore.subscribe(() => {
                  callback();
                })
              : () => {};
          return () => {
            unsubReal();
            unsubMock();
          };
        },
        localQueryResult: () => {
          try {
            let res = realWatch.localQueryResult();
            if (res !== undefined) {
              isFallback = false;
              // Sanitize remote legacy mock fallbacks if returned from Convex Cloud
              if (name === "dashboard:getPlatformKpis" && res && typeof res === "object") {
                const kpi = { ...(res as Record<string, unknown>) };
                if (kpi.totalInvoiceCount === 0 && (kpi.recentRevenue as number) > 0) {
                  kpi.recentRevenue = 0;
                  kpi.paidInvoiceCount = 0;
                  kpi.revenueTrend = [
                    { month: "May", revenue: 0 },
                    { month: "Jun", revenue: 0 },
                    { month: "Jul", revenue: 0 },
                    { month: "Aug", revenue: 0 },
                    { month: "Sep", revenue: 0 },
                    { month: "Oct", revenue: 0 },
                  ];
                }
                if (
                  kpi.attendanceRate === 88.5 &&
                  Array.isArray(kpi.attendanceTrend) &&
                  kpi.attendanceTrend.length === 6 &&
                  (kpi.attendanceTrend[0] as { rate?: number })?.rate === 82
                ) {
                  kpi.attendanceRate = 0;
                  kpi.attendanceTrend = [];
                }
                res = kpi;
              }

              // Track active academy ID from user profile or academy query
              if (name === "users:getCurrentUser" && res && typeof res === "object") {
                const uAcad = (res as { academyId?: string }).academyId;
                if (uAcad) activeTenantAcademyId = uAcad;
              }
              if (name === "academies:listAcademies" && Array.isArray(res)) {
                const hercules = (res as Array<{ _id?: string; slug?: string; name?: string }>).find(
                  (a) => a?.slug === "hercules-sports" || a?.name?.toLowerCase().includes("hercules"),
                );
                if (hercules?._id) activeTenantAcademyId = hercules._id;
              }

              const targetAcademyId = getActiveAcademyId();

              // Strict tenant isolation across all platform tabs and entities
              if (name === "users:listAcademyMembers" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((m) => {
                  if (m?.role === "platform_admin") return false;
                  if (m?.academyId && targetAcademyId && m.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(m as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "users:listAllUsers" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((m) => {
                  if (m?.role === "platform_admin") return false;
                  if (m?.academyId && targetAcademyId && m.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(m as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "invites:listInvites" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((inv) => {
                  if (inv?.academyId && targetAcademyId && inv.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(inv as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "athletes:listAthletes" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((ath) => {
                  if (ath?.academyId && targetAcademyId && ath.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(ath as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "teams:listTeams" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((team) => {
                  if (team?.academyId && targetAcademyId && team.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(team as Record<string, unknown>, targetAcademyId);
                });
              }

              if (
                (name === "trainingSessions:listSessionsForAcademy" ||
                  name === "trainingSessions:listTodaySessions" ||
                  name === "trainingSessions:listUpcomingSessions" ||
                  name === "trainingSessions:getSessionKioskRoster") &&
                Array.isArray(res)
              ) {
                res = (res as Array<Record<string, unknown>>).filter((session) => {
                  if (session?.academyId && targetAcademyId && session.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(session as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "announcements:listAnnouncements" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((ann) => {
                  if (ann?.academyId && targetAcademyId && ann.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(ann as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "academies:listAcademies" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((acad) => {
                  const slug = String(acad?.slug || "").toLowerCase();
                  const nameStr = String(acad?.name || "").toLowerCase();
                  return slug.includes("hercules") || nameStr.includes("hercules");
                });
              }

              if (name === "invoices:listInvoicesForAcademy" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((inv) => {
                  if (inv?.academyId && targetAcademyId && inv.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(inv as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "fees:listFeesForAcademy" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((fee) => {
                  if (fee?.academyId && targetAcademyId && fee.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(fee as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "messages:listConversations" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((conv) => {
                  if (conv?.academyId && targetAcademyId && conv.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(conv as Record<string, unknown>, targetAcademyId);
                });
              }

              if (name === "drills:listDrills" && Array.isArray(res)) {
                res = (res as Array<Record<string, unknown>>).filter((drill) => {
                  if (drill?.academyId && targetAcademyId && drill.academyId !== targetAcademyId) return false;
                  return isEntityInAcademy(drill as Record<string, unknown>, targetAcademyId);
                });
              }

              return res;
            }
            // If real query is undefined, it is currently in flight over Convex WebSocket / HTTP.
            // Return undefined so React renders loading state until real Convex DB data arrives.
            return undefined;
          } catch (err: unknown) {
            if (import.meta.env.PROD || !isLocalDev) {
              return undefined;
            }
            isFallback = true;
            return localMockStore.evaluateQuery(name, args);
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
        if (import.meta.env.PROD || !isLocalDev) {
          throw err;
        }
        const name = resolveFunctionName(mutation);
        const args = (argsAndOptions[0] || {}) as Record<string, unknown>;
        return await localMockStore.executeMutation(name, args);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseClient as any).query = async (query: any, ...argsAndOptions: any[]) => {
      try {
        return await originalQuery(query, ...argsAndOptions);
      } catch (err: unknown) {
        if (import.meta.env.PROD || !isLocalDev) {
          throw err;
        }
        const name = resolveFunctionName(query);
        const args = (argsAndOptions[0] || {}) as Record<string, unknown>;
        return localMockStore.evaluateQuery(name, args);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseClient as any).action = async (action: any, ...argsAndOptions: any[]) => {
      try {
        return await originalAction(action, ...argsAndOptions);
      } catch (err: unknown) {
        if (import.meta.env.PROD || !isLocalDev) {
          throw err;
        }
        const name = resolveFunctionName(action);
        const args = (argsAndOptions[0] || {}) as Record<string, unknown>;
        return await localMockStore.executeMutation(name, args);
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
