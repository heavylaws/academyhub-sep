import { Link } from "react-router-dom";
import {
  Activity,
  BarChart2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  HeartPulse,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { StatCard } from "./shared/stat-card.tsx";
import { SessionRow } from "./shared/session-row.tsx";

export type GuardianData = {
  role: "guardian";
  athleteId: string;
  athleteName: string;
  sport?: string;
  teamCount: number;
  upcomingSessionCount: number;
  activePlanCount: number;
  totalBalanceDue?: number;
  upcomingSessions: Array<{
    _id: string;
    title: string;
    startsAt: string;
    durationMinutes: number;
    location?: string;
    teamName: string;
  }>;
  activePlans: Array<{
    _id: string;
    title: string;
    startDate?: string;
    endDate?: string;
  }>;
  recentAssessments: Array<{
    _id: string;
    metric: string;
    value: number;
    unit?: string;
    assessedOn: string;
  }>;
};

export function GuardianDashboard({ data }: { data: GuardianData }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Dependent Athlete Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pink-500">
              Dependent Athlete Monitored
            </p>
            <p className="text-base font-bold text-foreground">
              {data.athleteName}{" "}
              {data.sport ? (
                <span className="text-xs font-normal text-muted-foreground">
                  ({data.sport})
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild>
            <Link to="/guardian/athletes">
              <User className="size-3.5 mr-1.5" />
              Guardian Portal
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/finance/my-fees">
              <DollarSign className="size-3.5" />
              Pay Invoices
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Enrolled Teams"
          value={data.teamCount}
          icon={Shield}
          to="/guardian/athletes"
        />
        <StatCard
          label="Upcoming Sessions"
          value={data.upcomingSessionCount}
          icon={CalendarClock}
          to="/schedule"
        />
        <StatCard
          label="Active Plans"
          value={data.activePlanCount}
          icon={ClipboardList}
          to="/guardian/athletes"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingSessions.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Activity />
                  </EmptyMedia>
                  <EmptyTitle>No upcoming sessions</EmptyTitle>
                  <EmptyDescription>
                    No sessions are scheduled yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {data.upcomingSessions.map((s) => (
                  <SessionRow key={s._id} session={s} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Active training plans */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Training plans</CardTitle>
                <Link
                  to="/guardian/athletes"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View in portal
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.activePlans.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList />
                    </EmptyMedia>
                    <EmptyTitle>No active plans</EmptyTitle>
                    <EmptyDescription>
                      Coaches will assign training plans here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.activePlans.map((p) => (
                    <Link
                      key={p._id}
                      to={`/plans/${p._id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <span className="font-medium truncate">{p.title}</span>
                      {p.endDate && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Due {p.endDate}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent assessments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="size-4 text-accent-foreground" />
                  Athlete performance
                </CardTitle>
                <Link
                  to="/guardian/athletes"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentAssessments.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BarChart2 />
                    </EmptyMedia>
                    <EmptyTitle>No assessments yet</EmptyTitle>
                    <EmptyDescription>
                      Performance assessments will appear here once recorded.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.recentAssessments.map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs text-muted-foreground truncate">
                          {a.metric}
                        </span>
                        <span className="font-mono text-base font-bold">
                          {a.value}
                          {a.unit ? ` ${a.unit}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <CheckCircle2 className="size-3.5 text-accent-foreground" />
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {a.assessedOn}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
