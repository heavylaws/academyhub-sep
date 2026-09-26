import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
  Activity,
  BarChart2,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Megaphone,
  DollarSign,
  HeartPulse,
  User,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";

// ─── Shared primitives ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  to,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
}) {
  const inner = (
    <Card className="transition-shadow hover:shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <span className="font-display text-3xl font-bold">{value}</span>
        )}
      </CardContent>
    </Card>
  );
  if (to) {
    return <Link to={to}>{inner}</Link>;
  }
  return inner;
}

function SessionRow({
  session,
}: {
  session: {
    _id: string;
    title: string;
    startsAt: string;
    durationMinutes: number;
    location?: string;
    teamName: string;
  };
}) {
  const start = new Date(session.startsAt);
  return (
    <Link
      to={`/sessions/${session._id}`}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{session.title}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {session.teamName}
          </Badge>
        </div>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          {format(start, "EEE, MMM d 'at' h:mm a")}
          {session.location && (
            <>
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{session.location}</span>
            </>
          )}
        </span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {session.durationMinutes} min
      </span>
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

// ─── Platform Admin Dashboard ─────────────────────────────────────────────────

type PlatformData = {
  role: "platform_admin";
  academyCount: number;
  userCount: number;
  academies: Array<{
    _id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  }>;
};

function PlatformAdminDashboard({ data }: { data: PlatformData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total academies"
          value={data.academyCount}
          icon={Building2}
          to="/admin/academies"
        />
        <StatCard
          label="Registered users"
          value={data.userCount}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Academies</CardTitle>
            <Link
              to="/admin/academies"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.academies.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 />
                </EmptyMedia>
                <EmptyTitle>No academies yet</EmptyTitle>
                <EmptyDescription>
                  Create your first academy from the Academies page.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {data.academies.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {a.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Academy Admin / Coach Dashboard ─────────────────────────────────────────

type AdminCoachData = {
  role: "academy_admin" | "coach" | "accounting";
  athleteCount: number;
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
  recentAssessments: Array<{
    _id: string;
    metric: string;
    value: number;
    unit?: string;
    assessedOn: string;
    athleteName: string;
    athleteId: string;
  }>;
  teams: Array<{
    _id: string;
    name: string;
    sport?: string;
    memberCount: number;
  }>;
};

function AdminCoachDashboard({ data }: { data: AdminCoachData }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active athletes"
          value={data.athleteCount}
          icon={UserRound}
          to={data.role === "accounting" ? undefined : "/athletes"}
        />
        <StatCard
          label="Teams"
          value={data.teamCount}
          icon={Shield}
          to={data.role === "accounting" ? undefined : "/teams"}
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
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming sessions</CardTitle>
              <Link
                to="/teams"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View teams
              </Link>
            </div>
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
                    Schedule sessions from a team's page.
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

        {/* Right column: teams + recent assessments */}
        <div className="flex flex-col gap-6">
          {/* Teams */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Teams</CardTitle>
                <Link
                  to="/teams"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.teams.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Shield />
                    </EmptyMedia>
                    <EmptyTitle>No teams yet</EmptyTitle>
                    <EmptyDescription>
                      Create your first team from the Teams page.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.teams.map((t) => (
                    <Link
                      key={t._id}
                      to={`/teams/${t._id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{t.name}</span>
                        {t.sport && (
                          <span className="text-xs text-muted-foreground">
                            {t.sport}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {t.memberCount}{" "}
                        {t.memberCount === 1 ? "athlete" : "athletes"}
                      </Badge>
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
                <CardTitle className="text-base">Recent assessments</CardTitle>
                <Link
                  to="/athletes"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View athletes
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
                      Record athlete performance from their profile.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recentAssessments.map((a) => (
                    <Link
                      key={a._id}
                      to={`/athletes/${a.athleteId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {a.metric}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {a.athleteName}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="font-mono text-sm font-semibold">
                          {a.value}
                          {a.unit ? ` ${a.unit}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {a.assessedOn}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendance leaderboard — spans full width */}
      <AttendanceLeaderboardCard />
    </div>
  );
}

// ─── Attendance Leaderboard Card ──────────────────────────────────────────────

function AttendanceLeaderboardCard() {
  const leaderboard = useQuery(
    api.trainingSessions.getAcademyAttendanceLeaderboard,
    {},
  );

  if (leaderboard === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4" />
            Attendance overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = leaderboard.top.length > 0 || leaderboard.bottom.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="size-4" />
          Attendance overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrendingUp />
              </EmptyMedia>
              <EmptyTitle>No attendance data yet</EmptyTitle>
              <EmptyDescription>
                Record attendance on session pages to see analytics here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {leaderboard.top.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="size-3.5 text-accent-foreground" />
                  Most consistent
                </p>
                {leaderboard.top.map((a, i) => (
                  <AttendanceRow
                    key={a.athleteId}
                    athlete={a}
                    rank={i + 1}
                    variant="top"
                  />
                ))}
              </div>
            )}
            {leaderboard.bottom.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingDown className="size-3.5 text-destructive" />
                  Needs attention
                </p>
                {leaderboard.bottom.map((a, i) => (
                  <AttendanceRow
                    key={a.athleteId}
                    athlete={a}
                    rank={i + 1}
                    variant="bottom"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceRow({
  athlete,
  rank,
  variant,
}: {
  athlete: { athleteId: string; name: string; rate: number; total: number };
  rank: number;
  variant: "top" | "bottom";
}) {
  const rateColor =
    athlete.rate >= 80
      ? "text-accent-foreground"
      : athlete.rate >= 60
        ? "text-yellow-500"
        : "text-destructive";

  return (
    <Link
      to={`/athletes/${athlete.athleteId}`}
      className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
        #{rank}
      </span>
      <span className="flex-1 text-sm font-medium truncate">
        {athlete.name}
      </span>
      {/* Progress bar */}
      <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              variant === "top"
                ? "bg-accent-foreground/70"
                : "bg-destructive/60",
            )}
            style={{ width: `${athlete.rate}%` }}
          />
        </div>
      </div>
      <span
        className={cn("text-sm font-bold tabular-nums shrink-0", rateColor)}
      >
        {athlete.rate}%
      </span>
    </Link>
  );
}

// ─── Athlete Dashboard ────────────────────────────────────────────────────────

type AthleteData = {
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

function AthleteDashboard({ data }: { data: AthleteData }) {
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

// ─── Guardian Dashboard ───────────────────────────────────────────────────────

type GuardianData = {
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

function GuardianDashboard({ data }: { data: GuardianData }) {
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

// ─── No Workspace State ───────────────────────────────────────────────────────

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
  const announcements = useQuery(api.announcements.listAnnouncements, {});
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
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
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
  const data = useQuery(api.dashboard.getDashboardData, {});
  const now = useMemo(() => new Date().toISOString(), []);

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
      ) : data.role === "academy_admin" ||
        data.role === "coach" ||
        data.role === "accounting" ? (
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
