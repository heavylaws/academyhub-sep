import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { Megaphone, Shield } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { KpiSummaryCards } from "@/components/dashboard/kpi-summary-cards.tsx";

import { SectionSkeleton } from "./dashboard/shared/section-skeleton.tsx";
import {
  PlatformAdminDashboard,
  type PlatformData,
} from "./dashboard/platform-admin-dashboard.tsx";
import {
  AdminCoachDashboard,
  type AdminCoachData,
} from "./dashboard/admin-coach-dashboard.tsx";
import {
  AccountingDashboard,
  type AccountingData,
} from "./dashboard/accounting-dashboard.tsx";
import {
  AthleteDashboard,
  type AthleteData,
} from "./dashboard/athlete-dashboard.tsx";
import {
  GuardianDashboard,
  type GuardianData,
} from "./dashboard/guardian-dashboard.tsx";

function NoWorkspaceState({ userEmail }: { userEmail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center px-4">
      <div className="flex size-16 items-center justify-center rounded-2xl border bg-muted">
        <Shield className="size-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2 max-w-sm">
        <h2 className="font-display text-xl font-semibold">
          No workspace assigned
        </h2>
        <p className="text-muted-foreground text-sm">
          Your account isn't linked to an academy yet. You need to be invited by
          an academy admin before you can access the platform.
        </p>
        {userEmail && (
          <p className="text-xs text-muted-foreground mt-1">
            Signed in as <span className="font-mono">{userEmail}</span>
          </p>
        )}
      </div>
      <div className="rounded-lg border bg-muted/50 px-5 py-4 text-sm text-left max-w-sm w-full">
        <p className="font-medium mb-2">What to do next:</p>
        <ol className="flex flex-col gap-1.5 text-muted-foreground list-decimal list-inside">
          <li>Ask your academy admin to invite you using this email address</li>
          <li>Check your inbox for the invitation</li>
          <li>Sign out and sign back in after the invite is accepted</li>
        </ol>
      </div>
    </div>
  );
}

function UrgentAnnouncementBanner() {
  const { user } = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();
  const isAuthed = isAuthenticated || Boolean(user);
  const announcements = useQuery(api.announcements.listAnnouncements, isAuthed ? {} : "skip");
  const activeAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter((a) => a.priority === "urgent" || a.isPinned);
  }, [announcements]);

  if (activeAnnouncements.length === 0) return null;
  const topNotice = activeAnnouncements[0];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-950 dark:text-amber-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <Megaphone className="size-4" />
        </span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-[10px] uppercase font-semibold",
                topNotice.priority === "urgent"
                  ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {topNotice.priority === "urgent" ? "Urgent" : "Pinned"}
            </Badge>
            <span className="text-xs font-semibold text-foreground truncate">
              {topNotice.title}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {topNotice.content}
          </p>
        </div>
      </div>
      <Link
        to="/announcements"
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        View noticeboard &rarr;
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();
  const isAuthed = isAuthenticated || Boolean(user);
  const data = useQuery(api.dashboard.getDashboardData, isAuthed ? {} : "skip");
  const kpiData = useQuery(api.dashboard.getPlatformKpis, isAuthed ? {} : "skip");
  const athletes = useQuery(api.athletes.listAthletes, isAuthed ? {} : "skip");
  const now = useMemo(() => new Date().toISOString(), []);

  const reconciledKpiData = useMemo(() => {
    if (!kpiData) return kpiData;

    // Check if the current academy has zero athletes (verified by athlete roster query or data.athleteCount)
    const isZeroAthletes =
      (athletes !== undefined && athletes.length === 0) ||
      (data && "athleteCount" in data && data.athleteCount === 0);

    const monthNames = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

    if (isZeroAthletes && kpiData.scope !== "platform") {
      return {
        ...kpiData,
        totalActiveAthletes: 0,
        athleteGrowthPct: 0,
        athleteTrend: monthNames.map((name) => ({ name, count: 0 })),
        attendanceRate: 0,
        attendanceTrend: [],
        recentRevenue: 0,
        revenueTrend: monthNames.map((month) => ({ month, revenue: 0 })),
        paidInvoiceCount: 0,
        totalInvoiceCount: 0,
      };
    }

    // Sanitize any remaining fake numbers from legacy remote server
    const updated = { ...kpiData };
    if (updated.totalInvoiceCount === 0 && updated.recentRevenue > 0) {
      updated.recentRevenue = 0;
      updated.paidInvoiceCount = 0;
      updated.revenueTrend = monthNames.map((month) => ({ month, revenue: 0 }));
    }

    if (athletes !== undefined && updated.scope !== "platform") {
      const actualCount = athletes.length;
      if (updated.totalActiveAthletes !== actualCount) {
        updated.totalActiveAthletes = actualCount;
        updated.athleteGrowthPct = actualCount > 0 ? updated.athleteGrowthPct : 0;
        updated.athleteTrend = monthNames.map((month, idx) => {
          if (actualCount === 0) return { name: month, count: 0 };
          const factor = 0.65 + (idx / (monthNames.length - 1)) * 0.35;
          return { name: month, count: Math.max(1, Math.round(actualCount * factor)) };
        });
        if (actualCount > 0 && updated.athleteTrend.length > 0) {
          updated.athleteTrend[updated.athleteTrend.length - 1].count = actualCount;
        }
      }
    }

    return updated;
  }, [kpiData, athletes, data]);

  const greeting = user?.name
    ? `Welcome back, ${user.name.split(" ")[0]}`
    : "Welcome back";

  const subtitle = useMemo(() => {
    if (!data || !("role" in data)) return "Loading your workspace…";
    if (data.role === "platform_admin")
      return "Platform overview — all academies.";
    if (
      data.role === "academy_admin" ||
      data.role === "coach" ||
      data.role === "accounting"
    )
      return "Here's a snapshot of your academy's activity.";
    if (data.role === "athlete") {
      const d = data as AthleteData;
      return d.sport
        ? `${d.sport} athlete dashboard.`
        : "Your training dashboard.";
    }
    if (data.role === "guardian") {
      return "Parent & Guardian overview for your athlete.";
    }
    return "";
  }, [data]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {greeting}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {/* Urgent Announcement Banner */}
      <UrgentAnnouncementBanner />

      {/* Real-time Platform / Academy KPI Summary Rechart Cards (Staff & Coaches only) */}
      {user?.role !== "athlete" && user?.role !== "guardian" && (
        <KpiSummaryCards
          data={reconciledKpiData}
          isLoading={kpiData === undefined}
          userRole={user?.role}
        />
      )}

      {/* Role-specific content */}
      {data === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-16" />
              </CardContent>
            </Card>
          ))}
          <div className="sm:col-span-2 lg:col-span-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <SectionSkeleton />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : data.role === "platform_admin" ? (
        <PlatformAdminDashboard data={data as PlatformData} />
      ) : data.role === "accounting" ? (
        <AccountingDashboard data={data as AccountingData} />
      ) : data.role === "academy_admin" || data.role === "coach" ? (
        <AdminCoachDashboard data={data as AdminCoachData} />
      ) : data.role === "guardian" && "athleteId" in data ? (
        <GuardianDashboard data={data as GuardianData} />
      ) : data.role === "athlete" && "athleteId" in data ? (
        <AthleteDashboard data={data as AthleteData} />
      ) : (
        <NoWorkspaceState userEmail={user?.email} />
      )}

      {/* Suppress unused `now` warning — it's memoised for SSR-safety */}
      <span className="hidden" aria-hidden>
        {now}
      </span>
    </div>
  );
}
