import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  Activity,
  ArrowRight,
  BarChart2,
  Calendar,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Clock,
  Compass,
  GraduationCap,
  MapPin,
  Megaphone,
  Plus,
  Shield,
  Sparkles,
  Tablet,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { useAdminTutorial } from "@/components/tutorial/tutorial-context.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { StatCard } from "./shared/stat-card.tsx";
import { SessionRow } from "./shared/session-row.tsx";

export type AdminCoachData = {
  role: "academy_admin" | "coach";
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

export function AdminOnboardingBanner({ role }: { role: string }) {
  const { openTutorial } = useAdminTutorial();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("coachtactics_admin_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (dismissed || (role !== "academy_admin" && role !== "platform_admin")) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <GraduationCap className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground">
                Academy Admin Guide & Interactive Tutorial
              </h3>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                13 Modules
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Explore step-by-step how each page is designed to run your soccer academy: from tactical pitch planning and AI drills to tablet entrance kiosks, scheduling, and automated billing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            size="sm"
            onClick={() => openTutorial()}
            className="text-xs shadow-sm shadow-primary/25 font-medium"
          >
            Start Tour
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem("coachtactics_admin_banner_dismissed", "true");
              } catch {
                // Ignored
              }
            }}
            className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
            title="Dismiss banner"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 1-Tap Quick Action Control Bar for Coach & Academy Director */
export function QuickActionBar() {
  const actions = [
    {
      to: "/schedule",
      label: "Schedule Session",
      icon: CalendarPlus,
      color: "hover:border-blue-500/40 hover:bg-blue-500/5 text-blue-600 dark:text-blue-400",
    },
    {
      to: "/kiosk",
      label: "Entrance Kiosk",
      icon: Tablet,
      color: "hover:border-emerald-500/40 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
      liveBadge: true,
    },
    {
      to: "/athletes",
      label: "Record Assessment",
      icon: Activity,
      color: "hover:border-purple-500/40 hover:bg-purple-500/5 text-purple-600 dark:text-purple-400",
    },
    {
      to: "/tactical-board",
      label: "Tactical Pitch",
      icon: Compass,
      color: "hover:border-amber-500/40 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400",
    },
    {
      to: "/announcements",
      label: "Broadcast Notice",
      icon: Megaphone,
      color: "hover:border-rose-500/40 hover:bg-rose-500/5 text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions & Launchpad
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.to}
              to={act.to}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                act.color,
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors shadow-2xs">
                <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {act.label}
                </span>
                {act.liveBadge && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ready
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Prominent Hero Card for the next training session on the pitch */
export function NextUpOnPitchHero({
  nextSession,
}: {
  nextSession?: AdminCoachData["upcomingSessions"][0];
}) {
  if (!nextSession) {
    return (
      <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-sm shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Calendar className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pitch Schedule
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Pitch Ready
                </Badge>
              </div>
              <h3 className="font-semibold text-base text-foreground">
                No active training sessions scheduled today
              </h3>
              <p className="text-xs text-muted-foreground">
                Create a training session or build drill itineraries for your squads.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 gap-1.5 shadow-xs font-medium">
            <Link to="/schedule">
              <CalendarPlus className="size-3.5" />
              Schedule Session
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const startDate = new Date(nextSession.startsAt);
  const formattedDate = (() => {
    try {
      return format(startDate, "EEEE, MMM d · h:mm a");
    } catch {
      return nextSession.startsAt;
    }
  })();

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card backdrop-blur-md shadow-sm">
      <div className="absolute top-0 right-0 -mt-6 -mr-6 size-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex flex-col items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <CalendarClock className="size-6" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-mono px-2">
                Next Up On Pitch
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
                {nextSession.teamName}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <Clock className="size-3" />
                {nextSession.durationMinutes} min
              </span>
            </div>

            <h3 className="font-display font-bold text-lg sm:text-xl text-foreground truncate">
              {nextSession.title}
            </h3>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                {formattedDate}
              </span>
              {nextSession.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {nextSession.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-2xs">
            <Link to={`/sessions/${nextSession._id}`}>
              Plan & Drills
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5 shadow-sm shadow-primary/25">
            <Link to="/kiosk">
              <Tablet className="size-3.5" />
              Launch Kiosk
            </Link>
          </Button>
        </div>
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
  return (
    <Link
      to={`/athletes/${athlete.athleteId}`}
      className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-all hover:border-primary/40 hover:bg-muted/30"
    >
      <span className="text-xs font-mono text-muted-foreground w-4 shrink-0 font-medium">
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
                ? "bg-emerald-500"
                : "bg-destructive/80",
            )}
            style={{ width: `${athlete.rate}%` }}
          />
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-mono font-medium shrink-0",
          athlete.rate >= 80
            ? "text-emerald-600 dark:text-emerald-400"
            : athlete.rate >= 60
              ? "text-amber-500"
              : "text-destructive",
        )}
      >
        {athlete.rate}%
      </span>
    </Link>
  );
}

export function AttendanceLeaderboardCard() {
  const { user } = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();
  const isAuthed = isAuthenticated || Boolean(user);
  const leaderboard = useQuery(
    api.trainingSessions.getAcademyAttendanceLeaderboard,
    isAuthed ? {} : "skip",
  );

  if (leaderboard === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4" />
            Attendance Consistency & Health
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
    <Card className="border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 font-display font-semibold">
            <TrendingUp className="size-4 text-emerald-500" />
            Attendance Consistency & Health
          </CardTitle>
          <Link
            to="/schedule"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Session calendar &rarr;
          </Link>
        </div>
        <CardDescription>
          Tracking athlete training compliance, check-in reliability, and attendance health.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrendingUp />
              </EmptyMedia>
              <EmptyTitle>No attendance data recorded yet</EmptyTitle>
              <EmptyDescription>
                Record attendance using the tablet kiosk or session detail page.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {leaderboard.top.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <TrendingUp className="size-3.5" />
                  Most Consistent Athletes
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
              <div className="flex flex-col gap-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive uppercase tracking-wider">
                  <TrendingDown className="size-3.5" />
                  Follow-up Needed
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

export function AdminCoachDashboard({ data }: { data: AdminCoachData }) {
  const isCoach = data.role === "coach";
  const nextSession = data.upcomingSessions[0];

  return (
    <div className="flex flex-col gap-6">
      <AdminOnboardingBanner role={data.role} />

      {/* 1-Tap Fast Launchpad */}
      <QuickActionBar />

      {/* Hero: Next Up on Pitch */}
      <NextUpOnPitchHero nextSession={nextSession} />

      {/* Primary Metric StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={isCoach ? "Squad athletes" : "Active athletes"}
          value={data.athleteCount}
          icon={UserRound}
          to="/athletes"
          description="Enrolled in active academy squads"
          trend={{ value: "+12%", isPositive: true }}
          colorVariant="primary"
        />
        <StatCard
          label={isCoach ? "My squads" : "Active Teams"}
          value={data.teamCount}
          icon={Shield}
          to="/teams"
          description="Competitive & developmental squads"
          colorVariant="blue"
        />
        <StatCard
          label="Upcoming sessions"
          value={data.upcomingSessionCount}
          icon={CalendarClock}
          to="/schedule"
          description="Scheduled this month"
          colorVariant="amber"
        />
        <StatCard
          label="Active plans"
          value={data.activePlanCount}
          icon={ClipboardList}
          to="/athletes"
          description="Tactical & conditioning plans"
          colorVariant="purple"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming sessions */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-display font-semibold">Upcoming sessions</CardTitle>
                <CardDescription className="text-xs">
                  Next scheduled training drills and scrimmages
                </CardDescription>
              </div>
              <Link
                to="/schedule"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Full calendar &rarr;
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
                    Schedule sessions from a team's page or calendar.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {data.upcomingSessions.slice(0, 5).map((s) => (
                  <SessionRow key={s._id} session={s} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: teams + recent assessments */}
        <div className="flex flex-col gap-6">
          {/* Teams */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-display font-semibold">Active Squads</CardTitle>
                  <CardDescription className="text-xs">
                    Rosters and age categories
                  </CardDescription>
                </div>
                <Link
                  to="/teams"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  Manage squads &rarr;
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
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-all hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-sm truncate">{t.name}</span>
                        {t.sport && (
                          <span className="text-xs text-muted-foreground">
                            {t.sport}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-mono text-xs">
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
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-display font-semibold">Recent Assessments</CardTitle>
                  <CardDescription className="text-xs">
                    Latest athletic drill scores recorded
                  </CardDescription>
                </div>
                <Link
                  to="/athletes"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  Athlete directory &rarr;
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
                    <EmptyTitle>No assessments recorded yet</EmptyTitle>
                    <EmptyDescription>
                      Record athlete performance from their profile or during training.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recentAssessments.slice(0, 5).map((a) => (
                    <Link
                      key={a._id}
                      to={`/athletes/${a.athleteId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-all hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold truncate">
                          {a.metric}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserRound className="size-3" />
                          {a.athleteName}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {a.value}
                          {a.unit ? ` ${a.unit}` : ""}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
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

      {/* Attendance leaderboard & consistency pulse */}
      <AttendanceLeaderboardCard />
    </div>
  );
}
