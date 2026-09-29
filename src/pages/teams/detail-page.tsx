import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  List,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  ErrorState,
  ErrorStateContent,
  ErrorStateDescription,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
} from "@/components/ui/error-state.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import EditTeamDialog from "./_components/edit-team-dialog.tsx";
import ManageRosterDialog from "./_components/manage-roster-dialog.tsx";
import ScheduleSessionDialog from "./_components/schedule-session-dialog.tsx";
import SessionCalendar from "./_components/session-calendar.tsx";

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const data = useQuery(
    api.teams.getTeam,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip",
  );
  const sessions = useQuery(
    api.trainingSessions.listSessionsForTeam,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip",
  );
  const deleteTeam = useMutation(api.teams.deleteTeam);

  const [editOpen, setEditOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sessionView, setSessionView] = useState<"calendar" | "list">(
    "calendar",
  );

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    try {
      await deleteTeam({ teamId: teamId as Id<"teams"> });
      toast.success("Team deleted");
      navigate("/teams");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to delete team",
      );
    }
  };

  if (data === undefined) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <ErrorState>
          <ErrorStateHeader>
            <ErrorStateMedia variant="icon">
              <Users />
            </ErrorStateMedia>
            <ErrorStateTitle>Team not found</ErrorStateTitle>
            <ErrorStateDescription>
              This team doesn't exist or you don't have access to it.
            </ErrorStateDescription>
          </ErrorStateHeader>
          <ErrorStateContent>
            <Button size="sm" onClick={() => navigate("/teams")}>
              Back to teams
            </Button>
          </ErrorStateContent>
        </ErrorState>
      </div>
    );
  }

  const { team, roster } = data;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate("/teams")}
      >
        <ArrowLeft className="size-4" />
        Back to teams
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {team.name}
            </h1>
            {team.sport && <Badge variant="secondary">{team.sport}</Badge>}
          </div>
          <p className="text-muted-foreground">
            {roster.length} {roster.length === 1 ? "athlete" : "athletes"} on
            this team
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
            >
              <Pencil className="size-4" />
              <span>Edit</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  <span>Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this team?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the team, its roster, and all its training
                    sessions and attendance records. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDeleteTeam}
                  >
                    Delete team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Roster</CardTitle>
            {canManage && (
              <Button
                variant="secondary"
                onClick={() => setRosterOpen(true)}
                className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
              >
                <UserRoundPlus className="size-4" />
                <span>Manage roster</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserRound />
                </EmptyMedia>
                <EmptyTitle>No athletes on this team</EmptyTitle>
                <EmptyDescription>
                  Add athletes from your academy to this team's roster.
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button
                    onClick={() => setRosterOpen(true)}
                    className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
                  >
                    <UserRoundPlus className="size-4" />
                    <span>Manage roster</span>
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div>
              {/* Mobile View: High-ergonomics cards */}
              <div className="flex flex-col divide-y sm:hidden -mx-2">
                {roster.map((athlete: Doc<"athletes">) => (
                  <Link
                    key={athlete._id}
                    to={`/athletes/${athlete._id}`}
                    className="flex items-center justify-between p-3 active:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-secondary text-xs font-semibold">
                          {athlete.firstName[0]}
                          {athlete.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {athlete.firstName} {athlete.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {athlete.sport || "Soccer"}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                      Profile
                    </Badge>
                  </Link>
                ))}
              </div>

              {/* Tablet & Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Sport</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((athlete: Doc<"athletes">) => (
                      <TableRow key={athlete._id}>
                        <TableCell>
                          <Link
                            to={`/athletes/${athlete._id}`}
                            className="flex items-center gap-3"
                          >
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-secondary text-xs">
                                {athlete.firstName[0]}
                                {athlete.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {athlete.firstName} {athlete.lastName}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {athlete.sport ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Training sessions</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* View toggle */}
              <div className="flex rounded-xl border overflow-hidden p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setSessionView("calendar")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    sessionView === "calendar"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  aria-label="Calendar view"
                >
                  <CalendarDays className="size-3.5" />
                  <span>Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSessionView("list")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    sessionView === "list"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  aria-label="List view"
                >
                  <List className="size-3.5" />
                  <span>List</span>
                </button>
              </div>
              {canManage && (
                <Button
                  onClick={() => setScheduleOpen(true)}
                  className="h-9 text-xs sm:text-sm font-semibold gap-1.5 ml-auto sm:ml-0"
                >
                  <Plus className="size-4" />
                  <span>Schedule session</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessions === undefined ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarClock />
                </EmptyMedia>
                <EmptyTitle>No sessions scheduled</EmptyTitle>
                <EmptyDescription>
                  Schedule your first training session for this team.
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setScheduleOpen(true)}>
                    <Plus className="size-4" />
                    Schedule session
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : sessionView === "calendar" ? (
            <SessionCalendar sessions={sessions} />
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session: Doc<"trainingSessions">) => {
                const start = new Date(session.startsAt);
                const isPast = session.startsAt < new Date().toISOString();
                return (
                  <Link
                    key={session._id}
                    to={`/sessions/${session._id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{session.title}</span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        {start.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {session.location && (
                          <>
                            <MapPin className="size-3.5" />
                            {session.location}
                          </>
                        )}
                      </span>
                    </div>
                    <Badge variant={isPast ? "outline" : "secondary"}>
                      {isPast ? "Completed" : "Upcoming"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <>
          <EditTeamDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            team={team}
          />
          <ManageRosterDialog
            open={rosterOpen}
            onOpenChange={setRosterOpen}
            teamId={team._id}
            currentRoster={roster}
          />
          <ScheduleSessionDialog
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            teamId={team._id}
          />
        </>
      )}
    </div>
  );
}
