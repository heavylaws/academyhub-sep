import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  MinusCircle,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

type AttendanceStatus =
  "present" | "absent" | "excused" | "late" | "unrecorded";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  present: {
    label: "Present",
    icon: CheckCircle2,
    color: "text-accent-foreground",
  },
  late: { label: "Late", icon: Clock, color: "text-yellow-500" },
  excused: {
    label: "Excused",
    icon: MinusCircle,
    color: "text-muted-foreground",
  },
  absent: { label: "Absent", icon: XCircle, color: "text-destructive" },
  unrecorded: {
    label: "Not recorded",
    icon: HelpCircle,
    color: "text-muted-foreground/50",
  },
};

type Props = {
  athleteId: Id<"athletes">;
};

export default function AthleteAttendanceCard({ athleteId }: Props) {
  const stats = useQuery(api.trainingSessions.getAthleteAttendanceStats, {
    athleteId,
  });

  if (stats === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4" />
            Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const rateColor =
    stats.attendanceRate >= 80
      ? "text-accent-foreground"
      : stats.attendanceRate >= 60
        ? "text-yellow-500"
        : "text-destructive";

  const ringColor =
    stats.attendanceRate >= 80
      ? "stroke-accent-foreground/80"
      : stats.attendanceRate >= 60
        ? "stroke-yellow-500"
        : "stroke-destructive";

  // SVG donut ring: circumference of r=28 circle ≈ 175.9
  const CIRC = 175.9;
  const dash = (stats.attendanceRate / 100) * CIRC;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4" />
            Attendance
          </CardTitle>
          {stats.totalSessions > 0 && (
            <span className="text-xs text-muted-foreground">
              {stats.totalSessions} past session
              {stats.totalSessions !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {stats.totalSessions === 0 ? (
          <p className="text-sm text-muted-foreground">
            No past sessions found for this athlete's teams.
          </p>
        ) : (
          <>
            {/* Rate ring + breakdown */}
            <div className="flex items-center gap-6">
              {/* Donut ring */}
              <div
                className="relative shrink-0 flex items-center justify-center"
                style={{ width: 72, height: 72 }}
              >
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  className="-rotate-90"
                >
                  <circle
                    cx="36"
                    cy="36"
                    r="28"
                    fill="none"
                    strokeWidth="8"
                    className="stroke-muted"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r="28"
                    fill="none"
                    strokeWidth="8"
                    strokeDasharray={`${dash} ${CIRC}`}
                    strokeLinecap="round"
                    className={cn("transition-all duration-500", ringColor)}
                  />
                </svg>
                <span
                  className={cn(
                    "absolute font-display text-lg font-bold",
                    rateColor,
                  )}
                >
                  {stats.attendanceRate}%
                </span>
              </div>

              {/* Breakdown pills */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm flex-1">
                {(["present", "late", "excused", "absent"] as const).map(
                  (s) => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        <Icon className={cn("size-3.5 shrink-0", cfg.color)} />
                        <span className="text-muted-foreground">
                          {cfg.label}
                        </span>
                        <span className="ml-auto font-medium tabular-nums">
                          {stats[s]}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Recent sessions strip */}
            {(stats.recentSessions ?? []).length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  Recent sessions
                </p>
                {(stats.recentSessions ?? []).map((s) => {
                  const cfg = STATUS_CONFIG[s.status];
                  const Icon = cfg.icon;
                  return (
                    <Link
                      key={s.sessionId}
                      to={`/sessions/${s.sessionId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium truncate">{s.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(s.startsAt), "EEE, MMM d")}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium shrink-0",
                          cfg.color,
                        )}
                      >
                        <Icon className="size-3.5" />
                        {cfg.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
