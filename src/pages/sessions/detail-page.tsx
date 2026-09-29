import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  XCircle,
  TabletSmartphone,
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
import EditSessionDialog from "./_components/edit-session-dialog.tsx";
import LiveSessionPerformance from "./_components/live-session-performance.tsx";

type AttendanceStatus = "present" | "absent" | "excused" | "late";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
  { value: "absent", label: "Absent" },
];

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-secondary text-secondary-foreground border-transparent",
  late: "bg-chart-4/20 text-foreground border-chart-4/40",
  excused: "bg-muted text-muted-foreground border-transparent",
  absent: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const data = useQuery(
    api.trainingSessions.getSessionWithAttendance,
    sessionId ? { sessionId: sessionId as Id<"trainingSessions"> } : "skip",
  );
  const setAttendance = useMutation(api.trainingSessions.setAttendance);
  const deleteSession = useMutation(api.trainingSessions.deleteSession);
  const [editOpen, setEditOpen] = useState(false);

  const handleSetStatus = async (
    athleteId: Id<"athletes">,
    status: AttendanceStatus,
  ) => {
    if (!sessionId) return;
    try {
      await setAttendance({
        sessionId: sessionId as Id<"trainingSessions">,
        athleteId,
        status,
      });
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to record attendance",
      );
    }
  };

  const handleDelete = async () => {
    if (!sessionId || !data) return;
    try {
      await deleteSession({ sessionId: sessionId as Id<"trainingSessions"> });
      toast.success("Session deleted");
      navigate(`/teams/${data.session.teamId}`);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to delete session",
      );
    }
  };

  if (data === undefined) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <ErrorState>
          <ErrorStateHeader>
            <ErrorStateMedia variant="icon">
              <CalendarClock />
            </ErrorStateMedia>
            <ErrorStateTitle>Session not found</ErrorStateTitle>
            <ErrorStateDescription>
              This training session doesn't exist or you don't have access to
              it.
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

  const { session, roster, attendance } = data;
  const attendanceByAthlete = new Map(attendance.map((a) => [a.athleteId, a]));
  const start = new Date(session.startsAt);
  const end = new Date(start.getTime() + session.durationMinutes * 60_000);

  const presentCount = attendance.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const excusedCount = attendance.filter((a) => a.status === "excused").length;
  const recordedCount = attendance.length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(`/teams/${session.teamId}`)}
      >
        <ArrowLeft className="size-4" />
        Back to team
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="font-display text-xl">
                {session.title}
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-4" />
                  {start.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" – "}
                  {end.toLocaleTimeString(undefined, { timeStyle: "short" })}
                </span>
                {session.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {session.location}
                  </span>
                )}
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/kiosk/${session._id}`)}
                  className="h-10 sm:h-9 text-xs sm:text-sm gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
                >
                  <TabletSmartphone className="size-4" />
                  <span>Kiosk Mode</span>
                </Button>
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
                      <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the session and all its attendance records.
                        This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                      >
                        Delete session
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
        {session.notes && (
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {session.notes}
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Attendance</CardTitle>
              <span className="text-sm text-muted-foreground">
                {recordedCount}/{roster.length} recorded
              </span>
            </div>
            {/* Summary chips */}
            {roster.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-secondary px-2.5 py-1 text-xs font-medium">
                  <CheckCircle2 className="size-3.5 text-accent-foreground" />
                  {presentCount} present / late
                </span>
                {absentCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    <XCircle className="size-3.5" />
                    {absentCount} absent
                  </span>
                )}
                {excusedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3.5" />
                    {excusedCount} excused
                  </span>
                )}
                {roster.length - recordedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {roster.length - recordedCount} not recorded
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 />
                </EmptyMedia>
                <EmptyTitle>No athletes on this team</EmptyTitle>
                <EmptyDescription>
                  Add athletes to the team's roster to track attendance.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div>
              {/* Mobile View: High-ergonomics touch attendance cards */}
              <div className="flex flex-col divide-y sm:hidden -mx-2">
                {roster.map((athlete: Doc<"athletes">) => {
                  const record = attendanceByAthlete.get(athlete._id);
                  const status = record?.status;

                  return (
                    <div key={athlete._id} className="p-3 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-secondary text-xs">
                              {athlete.firstName[0]}
                              {athlete.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm text-foreground">
                            {athlete.firstName} {athlete.lastName}
                          </span>
                        </div>

                        {status && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              STATUS_STYLES[status],
                            )}
                          >
                            {status === "present" ? (
                              <CheckCircle2 className="size-2.5" />
                            ) : status === "absent" ? (
                              <XCircle className="size-2.5" />
                            ) : (
                              <Clock className="size-2.5" />
                            )}
                            {STATUS_OPTIONS.find((o) => o.value === status)?.label}
                          </span>
                        )}
                      </div>

                      {canManage && (
                        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/40 border border-border/50">
                          {STATUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                handleSetStatus(athlete._id, option.value)
                              }
                              className={cn(
                                "h-9 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center",
                                status === option.value
                                  ? STATUS_STYLES[option.value] + " shadow-xs font-bold"
                                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tablet & Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Athlete</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((athlete: Doc<"athletes">) => {
                      const record = attendanceByAthlete.get(athlete._id);
                      const status = record?.status;
                      return (
                        <TableRow key={athlete._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-secondary text-xs">
                                  {athlete.firstName[0]}
                                  {athlete.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {athlete.firstName} {athlete.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage ? (
                              <div className="flex justify-end gap-1">
                                {STATUS_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      handleSetStatus(athlete._id, option.value)
                                    }
                                    className={cn(
                                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                      status === option.value
                                        ? STATUS_STYLES[option.value]
                                        : "border-transparent text-muted-foreground hover:bg-accent",
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            ) : status ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                                  STATUS_STYLES[status],
                                )}
                              >
                                {status === "present" ? (
                                  <CheckCircle2 className="size-3" />
                                ) : status === "absent" ? (
                                  <XCircle className="size-3" />
                                ) : (
                                  <Clock className="size-3" />
                                )}
                                {
                                  STATUS_OPTIONS.find((o) => o.value === status)
                                    ?.label
                                }
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Not recorded
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <LiveSessionPerformance
        sessionId={session._id}
        roster={roster}
        attendance={attendance}
        canManage={canManage}
      />

      {canManage && (
        <EditSessionDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          session={session}
        />
      )}
    </div>
  );
}
