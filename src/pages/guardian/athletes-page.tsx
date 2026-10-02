import { Link } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  UserRound,
  DollarSign,
  Mail,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

export default function GuardianAthletesPage() {
  const { user } = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();
  const overview = useQuery(
    api.athletes.listMyAthletesOverview,
    isAuthenticated ? {} : "skip",
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HeartPulse className="size-6 text-primary" />
            Family Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your athletes' teams, upcoming practices, attendance and fees.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link to="/finance/my-fees">
            <DollarSign className="size-3.5 text-emerald-500" />
            View Fees
          </Link>
        </Button>
      </div>

      {/* Guardian account */}
      <Card className="bg-card/40 border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user?.name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "G"}
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">
              {user?.name ?? "Guardian"}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Mail className="size-3" />
              {user?.email}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked athletes */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <UserRound className="size-4 text-primary" />
          Your Athletes{overview ? ` (${overview.length})` : ""}
        </h2>

        {overview === undefined ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : overview.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            <UserRound className="size-8 mx-auto mb-2 opacity-50" />
            No athletes are linked to this account yet. Ask academy staff to add
            your email ({user?.email}) as the guardian email on your athlete's
            profile.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {overview.map(
              ({
                athlete,
                teams,
                nextSession,
                attendanceRate,
                recordedSessions,
                metricsTracked,
              }) => (
                <Card
                  key={athlete._id}
                  className="border-border hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          {athlete.firstName} {athlete.lastName}
                        </CardTitle>
                        {(athlete.sport || athlete.dateOfBirth) && (
                          <CardDescription className="text-xs flex items-center gap-2 mt-0.5">
                            {athlete.sport && <span>{athlete.sport}</span>}
                            {athlete.sport && athlete.dateOfBirth && (
                              <span>•</span>
                            )}
                            {athlete.dateOfBirth && (
                              <span>DOB: {athlete.dateOfBirth}</span>
                            )}
                          </CardDescription>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="capitalize bg-primary/10 text-primary border-primary/20 text-xs"
                      >
                        {athlete.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 text-xs">
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 border text-center">
                      <div>
                        <div className="text-muted-foreground text-[11px]">
                          Attendance
                        </div>
                        <div className="font-bold text-sm text-foreground">
                          {attendanceRate === null ? "—" : `${attendanceRate}%`}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {recordedSessions} recorded
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[11px]">
                          Teams
                        </div>
                        <div className="font-bold text-sm text-foreground truncate">
                          {teams.length === 0
                            ? "—"
                            : teams.map((t) => t.name).join(", ")}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[11px]">
                          Metrics tracked
                        </div>
                        <div className="font-bold text-sm text-foreground">
                          {metricsTracked}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <span>Next practice:</span>
                        <span className="font-medium text-foreground text-right">
                          {nextSession
                            ? `${format(new Date(nextSession.startsAt), "EEE, MMM d · h:mm a")}${nextSession.teamName ? ` (${nextSession.teamName})` : ""}`
                            : "None scheduled"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Check-in PIN:</span>
                        {athlete.checkInPin ? (
                          <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                            {athlete.checkInPin}
                          </span>
                        ) : (
                          <span>Not assigned yet — ask academy staff</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 text-xs gap-1"
                      >
                        <Link to={`/athletes/${athlete._id}`}>
                          <Sparkles className="size-3.5" />
                          View Progress
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                      >
                        <Link to="/finance/my-fees">
                          <DollarSign className="size-3.5 text-emerald-500" />
                          Fees
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
