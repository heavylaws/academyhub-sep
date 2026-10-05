import React from "react";
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Tooltip,
  XAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

export interface KpiData {
  scope?: "platform" | "academy" | "coach" | "accounting";
  role?: string;
  academyName?: string;
  showFinancials?: boolean;
  totalActiveAthletes: number;
  athleteGrowthPct: number;
  athleteTrend: Array<{ name: string; count: number }>;
  attendanceRate: number;
  attendanceTrend: Array<{ session: string; rate: number }>;
  recentRevenue: number;
  revenueTrend: Array<{ month: string; revenue: number }>;
  currency: string;
  paidInvoiceCount: number;
  totalInvoiceCount: number;
  academyCount?: number;
  userCount?: number;
}

interface KpiSummaryCardsProps {
  data?: KpiData | null;
  isLoading?: boolean;
  userRole?: string;
}

interface TooltipPayloadItem {
  value: number;
  name?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomAreaTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-lg p-2 shadow-lg text-[11px] leading-tight">
        <span className="font-semibold text-muted-foreground block">{label}</span>
        <span className="font-bold text-foreground font-mono">
          {payload[0].value.toLocaleString()} athletes
        </span>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-lg p-2 shadow-lg text-[11px] leading-tight">
        <span className="font-semibold text-muted-foreground block">Session {label}</span>
        <span className="font-bold text-emerald-400 font-mono">
          {payload[0].value}% attendance
        </span>
      </div>
    );
  }
  return null;
};

const CustomRevenueTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-lg p-2 shadow-lg text-[11px] leading-tight">
        <span className="font-semibold text-muted-foreground block">{label}</span>
        <span className="font-bold text-foreground font-mono">
          ${payload[0].value.toLocaleString()}
        </span>
      </div>
    );
  }
  return null;
};

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({
  data,
  isLoading = false,
  userRole,
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isPlatform = data.scope === "platform" || userRole === "platform_admin";
  const isCoach = data.scope === "coach" || userRole === "coach" || data.role === "coach";
  const isAccounting = data.scope === "accounting" || userRole === "accounting" || data.role === "accounting";
  const showRevenue = data.showFinancials !== false && !isCoach;
  const hasAttendanceData = (data.attendanceTrend?.length ?? 0) > 0 && data.attendanceRate > 0;
  const hasBillingData = (data.totalInvoiceCount ?? 0) > 0 || (data.recentRevenue ?? 0) > 0;

  const headerTitle = isPlatform
    ? "Platform Performance Overview"
    : isCoach
      ? "Squad & Coaching Telemetry"
      : isAccounting
        ? `${data.academyName || "Academy"} Financial Telemetry`
        : `${data.academyName || "Academy"} Performance KPIs`;

  const badgeLabel = isPlatform
    ? "Platform Global"
    : isCoach
      ? "Coaching Pulse"
      : isAccounting
        ? "Finance & Invoicing"
        : "Academy Pulse";

  const subtitle = isPlatform
    ? "Live multi-tenant telemetry & SaaS metrics across all academies"
    : isCoach
      ? "Live squad roster participation and session attendance trends"
      : isAccounting
        ? "Live collections, receivables, and invoice statuses"
        : `Live operational telemetry and metrics for ${data.academyName || "your academy"}`;

  const formattedRevenue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency || "USD",
    maximumFractionDigits: 0,
  }).format(data.recentRevenue);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {headerTitle}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono font-semibold bg-primary/5 text-primary border-primary/20"
          >
            {badgeLabel}
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {subtitle}
        </span>
      </div>

      <div
        className={cn(
          "grid gap-4 w-full",
          isPlatform && data.academyCount !== undefined
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : !showRevenue
              ? "sm:grid-cols-2"
              : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {/* Platform Admin Special Card: Total Academies */}
        {isPlatform && data.academyCount !== undefined && (
          <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ArrowUpRight className="size-3.5 text-primary" />
                  <span>Total Academies</span>
                </span>
                <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {data.academyCount}
                </CardTitle>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-1.5 py-0.5"
                >
                  <span>Active</span>
                </Badge>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {data.userCount ?? 0} total users
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-3">
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground mt-8">
                <span>Multi-tenant academies</span>
                <span className="font-mono font-medium text-foreground">SaaS platform</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 1: Total Active Athletes */}
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-blue-500" />
                <span>
                  {isPlatform
                    ? "Platform Active Athletes"
                    : isCoach
                      ? "Squad Active Athletes"
                      : "Total Active Athletes"}
                </span>
              </span>
              <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                {data.totalActiveAthletes}
              </CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="secondary"
                className={cn(
                  "border text-[10px] font-bold gap-1 px-1.5 py-0.5",
                  data.totalActiveAthletes > 0
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border/60",
                )}
              >
                {data.totalActiveAthletes > 0 ? (
                  <>
                    <TrendingUp className="size-3" />
                    <span>+{data.athleteGrowthPct}%</span>
                  </>
                ) : (
                  <span>0 Enrolled</span>
                )}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                {data.totalActiveAthletes > 0 ? "vs last month" : "No athletes yet"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-3 px-3">
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.athleteTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="athletesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#athletesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
              <span>{isCoach ? "Squad roster enrollment" : "Active roster enrollment"}</span>
              <span className="font-mono font-medium text-foreground">
                {data.totalActiveAthletes > 0 ? "6-mo trend" : "No roster data"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Session Attendance Rate */}
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Activity className="size-3.5 text-emerald-500" />
                <span>
                  {isPlatform ? "Platform Attendance Rate" : "Session Attendance Rate"}
                </span>
              </span>
              <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                {hasAttendanceData ? `${data.attendanceRate}%` : "—"}
              </CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="secondary"
                className={cn(
                  "border text-[10px] font-bold gap-1 px-1.5 py-0.5",
                  hasAttendanceData && data.attendanceRate >= 85
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-emerald-500/20"
                    : hasAttendanceData
                      ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/20"
                      : "bg-muted text-muted-foreground border-border/60",
                )}
              >
                {hasAttendanceData ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    <span>{data.attendanceRate >= 85 ? "Target Met" : "Below Goal"}</span>
                  </>
                ) : (
                  <span>No sessions yet</span>
                )}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                {hasAttendanceData ? "goal: >= 85%" : "Awaiting sessions"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-3 px-3">
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.attendanceTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="rate"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
              <span>{hasAttendanceData ? "Past 6 training sessions" : "Session history"}</span>
              <span
                className={cn(
                  "font-mono font-medium",
                  hasAttendanceData ? "text-emerald-500 font-bold" : "text-muted-foreground",
                )}
              >
                {hasAttendanceData
                  ? data.attendanceRate >= 85
                    ? "Consistent"
                    : "Developing"
                  : "No records yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Recent Revenue — Only shown if authorized (Platform Admin, Academy Admin, Accounting) */}
        {showRevenue && (
          <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-amber-500" />
                  <span>{isPlatform ? "Platform Revenue" : "Recent Revenue"}</span>
                </span>
                <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {formattedRevenue}
                </CardTitle>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="secondary"
                  className={cn(
                    "border text-[10px] font-bold gap-1 px-1.5 py-0.5",
                    hasBillingData
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 border-amber-500/20"
                      : "bg-muted text-muted-foreground border-border/60",
                  )}
                >
                  <ShieldCheck className="size-3" />
                  <span>{data.paidInvoiceCount} Paid</span>
                </Badge>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {data.totalInvoiceCount} total invoices
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-3 px-3">
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<CustomRevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                <span>Collections trajectory</span>
                <span className="font-mono font-medium text-foreground">
                  {hasBillingData ? "Healthy" : "No invoices yet"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
