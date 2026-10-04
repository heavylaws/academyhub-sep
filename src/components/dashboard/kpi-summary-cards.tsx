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

export interface KpiData {
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
}

interface KpiSummaryCardsProps {
  data?: KpiData;
  isLoading?: boolean;
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
}) => {
  if (isLoading || !data) {
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
            Platform Performance KPIs
          </span>
          <Badge variant="outline" className="text-[10px] font-mono font-semibold bg-primary/5 text-primary border-primary/20">
            Real-Time
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          Live academy telemetry & financial metrics
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {/* Card 1: Total Active Athletes */}
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-blue-500" />
                <span>Total Active Athletes</span>
              </span>
              <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                {data.totalActiveAthletes}
              </CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border border-emerald-500/20 text-[10px] font-bold gap-1 px-1.5 py-0.5"
              >
                <TrendingUp className="size-3" />
                <span>+{data.athleteGrowthPct}%</span>
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">vs last month</span>
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
              <span>Active roster enrollment</span>
              <span className="font-mono font-medium text-foreground">6-mo trend</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Session Attendance Rate */}
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Activity className="size-3.5 text-emerald-500" />
                <span>Session Attendance Rate</span>
              </span>
              <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                {data.attendanceRate}%
              </CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border border-emerald-500/20 text-[10px] font-bold gap-1 px-1.5 py-0.5"
              >
                <CheckCircle2 className="size-3" />
                <span>Target Met</span>
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">goal: &gt;= 85%</span>
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
              <span>Past 6 training sessions</span>
              <span className="font-mono font-medium text-emerald-500 font-bold">Consistent</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Recent Revenue */}
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-amber-500" />
                <span>Recent Revenue</span>
              </span>
              <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                {formattedRevenue}
              </CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 text-[10px] font-bold gap-1 px-1.5 py-0.5"
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
              <span className="font-mono font-medium text-foreground">Healthy</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
