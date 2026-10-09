import { Link } from "react-router-dom";
import {
  Activity,
  BarChart2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Shield,
  Sparkles,
} from "lucide-react";
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

export type AthleteData = {
  role: "athlete";
  athleteId: string;
  athleteName: string;
  sport?: string;
  teamCount: number;
  upcomingSessionCount: number;
  activePlanCount: number;
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

export function AthleteDashboard({ data }: { data: AthleteData }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="My teams"
          value={data.teamCount}
          icon={Shield}
          to="/teams"
        />
        <StatCard
          label="Upcoming sessions"
          value={data.upcomingSessionCount}
          icon={CalendarClock}
        />
        <StatCard
          label="Active plans"
          value={data.activePlanCount}
          icon={ClipboardList}
          to={`/athletes/${data.athleteId}`}
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
                  to={`/athletes/${data.athleteId}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View profile
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
                      Your coach will assign training plans here.
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
                  My performance
                </CardTitle>
                <Link
                  to={`/athletes/${data.athleteId}`}
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
                      Your coach will record performance metrics here.
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
