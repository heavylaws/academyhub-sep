import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Info,
  Plus,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import LogInjuryDialog from "./log-injury-dialog.tsx";

import { AVAILABILITY_CONFIG, RISK_ZONE_CONFIG } from "./readiness-config.ts";

interface AthleteReadinessCardProps {
  athleteId: Id<"athletes">;
  athleteName: string;
  canEditMedical: boolean;
}

export default function AthleteReadinessCard({
  athleteId,
  athleteName,
  canEditMedical,
}: AthleteReadinessCardProps) {
  const workload = useQuery(api.workload.getAthleteWorkloadAndACWR, { athleteId });
  const [logInjuryOpen, setLogInjuryOpen] = useState(false);

  if (workload === undefined) {
    return (
      <Card className="border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const avail =
    AVAILABILITY_CONFIG[workload.availabilityStatus] ?? AVAILABILITY_CONFIG.fit;
  const AvailIcon = avail.icon;
  const risk =
    RISK_ZONE_CONFIG[workload.riskZone] ?? RISK_ZONE_CONFIG.insufficient_data;

  const maxDailyLoad = Math.max(
    ...workload.dailyLoads.map((d) => d.load),
    100,
  );

  return (
    <>
      <Card className={cn("border transition-all", avail.borderClass)}>
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <span>Readiness, ACWR & Medical Availability</span>
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous workload telemetry (sRPE × Duration) and Return-To-Play status
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                avail.badgeClass,
              )}
            >
              <AvailIcon className="size-3.5" />
              {avail.label}
            </span>

            {canEditMedical && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLogInjuryOpen(true)}
                className="text-xs gap-1.5 h-8"
              >
                <Plus className="size-3.5" />
                Log Medical Record
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-5">
          {/* Active Coaching Restrictions Directive */}
          {workload.coachingRestrictions && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Medical Staff Directives for Coaching:
                </p>
                <p className="text-amber-800 dark:text-amber-200/90 leading-relaxed">
                  {workload.coachingRestrictions}
                </p>
              </div>
            </div>
          )}

          {/* Metric KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Acute 7d Load */}
            <div className="rounded-xl border bg-card p-3 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Acute 7d Load</span>
                <Zap className="size-3.5 text-primary" />
              </div>
              <div className="mt-2">
                <span className="font-display text-xl font-bold">
                  {workload.acuteLoad7d.toLocaleString()}
                </span>
                <span
                  className="text-[11px] text-muted-foreground ml-1 cursor-help"
                  title="Arbitrary Units (AU): Session RPE × Duration in minutes. Standard sports science training load."
                >
                  AU
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Fatigue stimulus (last 7 days)</p>
            </div>

            {/* Chronic 28d Weekly Avg */}
            <div className="rounded-xl border bg-card p-3 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Chronic 28d Weekly Avg</span>
                <TrendingUp className="size-3.5 text-primary" />
              </div>
              <div className="mt-2">
                <span className="font-display text-xl font-bold">
                  {workload.chronicLoadWeeklyAvg28d.toLocaleString()}
                </span>
                <span
                  className="text-[11px] text-muted-foreground ml-1 cursor-help"
                  title="Arbitrary Units per week (AU/wk): 28-day rolling weekly average training load."
                >
                  AU/wk
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Historical baseline fitness</p>
            </div>

            {/* ACWR Ratio */}
            <div className="rounded-xl border bg-card p-3 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>ACWR Ratio</span>
                <Info className="size-3.5 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "font-display text-2xl font-bold",
                    risk.textClass,
                  )}
                >
                  {workload.acwr !== null ? workload.acwr.toFixed(2) : "—"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Acute ÷ Chronic Load Ratio
              </p>
            </div>

            {/* Risk Zone Classification */}
            <div className="rounded-xl border bg-card p-3 shadow-xs flex flex-col justify-between">
              <div className="text-xs text-muted-foreground">Risk Zone</div>
              <div className="mt-2">
                <Badge
                  className={cn("text-xs font-semibold px-2 py-0.5 border", risk.badgeClass)}
                >
                  {risk.label}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                {risk.desc}
              </p>
            </div>
          </div>

          {/* 28-Day Load Distribution Sparkline Chart */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                28-Day Daily Load Distribution (AU)
              </span>
              <span className="text-muted-foreground text-[11px]">
                Total: {workload.total28dLoad.toLocaleString()} AU across {workload.totalSessions28d} entries
              </span>
            </div>

            <div className="flex items-end gap-1 h-14 pt-2">
              {workload.dailyLoads.map((day, idx) => {
                const heightPct = Math.max(
                  4,
                  Math.round((day.load / maxDailyLoad) * 100),
                );
                const isRecent7d = idx >= 21;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-popover text-popover-foreground border shadow-md text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10">
                      {day.date}: {day.load} AU
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={cn(
                        "w-full rounded-t transition-all",
                        day.load === 0
                          ? "bg-muted/40"
                          : isRecent7d
                            ? "bg-primary hover:brightness-110"
                            : "bg-primary/40 hover:bg-primary/60",
                      )}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
              <span>28 days ago</span>
              <span>14 days ago</span>
              <span className="font-medium text-primary">Last 7 days (Acute)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Injury Modal */}
      {canEditMedical && (
        <LogInjuryDialog
          open={logInjuryOpen}
          onOpenChange={setLogInjuryOpen}
          athleteId={athleteId}
          athleteName={athleteName}
        />
      )}
    </>
  );
}
