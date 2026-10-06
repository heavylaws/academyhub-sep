import { useState, useMemo } from "react";
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
  Compass,
  BookOpen,
  Timer,
  Plus,
  Dumbbell,
  Target,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Printer,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/status-state.tsx";
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
import { SOCCER_DRILLS, combineAllDrills, type SoccerDrill } from "@/data/soccer-drills.ts";
import EditSessionDialog from "./_components/edit-session-dialog.tsx";
import LiveSessionPerformance from "./_components/live-session-performance.tsx";
import AddSessionDrillDialog from "./_components/add-session-drill-dialog.tsx";
import SessionSheetExportModal from "./_components/session-sheet-export-modal.tsx";

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
  const teamData = useQuery(
    api.teams.getTeam,
    data?.session?.teamId ? { teamId: data.session.teamId } : "skip",
  );
  const tacticalPlans = useQuery(api.tacticalPlans.listTacticalPlans, canManage ? {} : "skip");
  const setAttendance = useMutation(api.trainingSessions.setAttendance);
  const deleteSession = useMutation(api.trainingSessions.deleteSession);
  const linkTacticalPlan = useMutation(api.trainingSessions.linkTacticalPlanToSession);
  const linkDrill = useMutation(api.trainingSessions.linkDrillToSession);
  const removeDrill = useMutation(api.trainingSessions.removeDrillFromSession);

  const [editOpen, setEditOpen] = useState(false);
  const [addDrillOpen, setAddDrillOpen] = useState(false);
  const [sheetExportOpen, setSheetExportOpen] = useState(false);
  const [inspectDrill, setInspectDrill] = useState<SoccerDrill | null>(null);
  const [removingDrillId, setRemovingDrillId] = useState<string | null>(null);

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

  const handleRemoveDrill = async (drillId: string) => {
    if (!sessionId) return;
    setRemovingDrillId(drillId);
    try {
      await removeDrill({
        sessionId: sessionId as Id<"trainingSessions">,
        drillId,
      });
      toast.success("Drill removed from session itinerary");
    } catch {
      toast.error("Failed to remove drill");
    } finally {
      setRemovingDrillId(null);
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

  const session = data?.session;
  const roster = useMemo(() => data?.roster ?? [], [data?.roster]);
  const attendance = useMemo(() => data?.attendance ?? [], [data?.attendance]);

  const resolvedDrillsList = useMemo(() => {
    if (!session) return [];
    const drillIds = session.drillIds ?? [];
    const all = combineAllDrills(SOCCER_DRILLS, data?.resolvedDrills);
    const map = new Map<string, SoccerDrill>();
    all.forEach((d) => map.set(d.id, d));
    return drillIds.map((id) => map.get(id)).filter((d): d is SoccerDrill => Boolean(d));
  }, [session, data?.resolvedDrills]);

  const totalDrillsDuration = useMemo(() => {
    return resolvedDrillsList.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  }, [resolvedDrillsList]);

  const durationPercentage =
    session && session.durationMinutes > 0
      ? Math.min(100, Math.round((totalDrillsDuration / session.durationMinutes) * 100))
      : 0;

  if (data === undefined) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (data === null || !session) {
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
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setSheetExportOpen(true)}
                className="h-10 sm:h-9 text-xs sm:text-sm gap-1.5 font-semibold"
                title="Open printable clipboard practice plan sheet"
              >
                <Printer className="size-4 text-primary" />
                <span>Print Sheet</span>
              </Button>
              {canManage && (
                <>
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
                </>
              )}
            </div>
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

      {/* Tactical Routine & Tactical Board Link Card */}
      <Card className="border border-border/80">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="size-5 text-primary" />
              <div>
                <CardTitle className="text-base">Tactical Routine & Playbook Link</CardTitle>
                <CardDescription>
                  Pitch layout, passing patterns, and tactical concepts assigned to this session.
                </CardDescription>
              </div>
            </div>
            {data.tacticalPlan && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    `/tactical-board?planId=${data.tacticalPlan!._id}&teamId=${session.teamId}`,
                  )
                }
                className="h-9 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
              >
                <Compass className="size-4" />
                <span>Open in Tactical Board</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.tacticalPlan ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-muted/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{data.tacticalPlan.title}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {data.tacticalPlan.pitchType.replace(/_/g, " ")}
                  </Badge>
                  {data.tacticalPlan.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {data.tacticalPlan.category}
                    </Badge>
                  )}
                </div>
                {data.tacticalPlan.coachingPoints && data.tacticalPlan.coachingPoints.length > 0 && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    🎯 Coaching Points: {data.tacticalPlan.coachingPoints.join(" • ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() =>
                    navigate(
                      `/tactical-board?planId=${data.tacticalPlan!._id}&teamId=${session.teamId}`,
                    )
                  }
                  className="h-8 text-xs font-medium gap-1"
                >
                  <Compass className="size-3.5" />
                  <span>Launch Board</span>
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await linkTacticalPlan({
                        sessionId: session._id,
                        tacticalPlanId: undefined,
                      });
                      toast.success("Tactical plan unlinked from session");
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Unlink
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-dashed text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                <span>No tactical routine linked to this session yet.</span>
              </div>
              {canManage && (
                <div className="flex items-center gap-2 flex-wrap">
                  {tacticalPlans && tacticalPlans.length > 0 && (
                    <select
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                      defaultValue=""
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          await linkTacticalPlan({
                            sessionId: session._id,
                            tacticalPlanId: val as Id<"tacticalPlans">,
                          });
                          toast.success("Linked tactical plan to session");
                        } catch {
                          toast.error("Failed to link tactical plan");
                        }
                      }}
                    >
                      <option value="" disabled>
                        + Link from Playbook...
                      </option>
                      {tacticalPlans.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/tactical-board?teamId=${session.teamId}`)}
                    className="h-8 text-xs gap-1"
                  >
                    <Compass className="size-3.5" />
                    <span>Create on Board</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Drill Itinerary & Practice Schedule */}
          <div className="pt-2 border-t space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Timer className="size-4 text-primary" />
                  <span className="font-semibold text-sm">Practice Itinerary & Drills</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {totalDrillsDuration}m / {session.durationMinutes}m planned
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sequential drills and rondos structured for this training block.
                </p>
              </div>

              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddDrillOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="size-3.5" />
                  <span>Add Drill to Itinerary</span>
                </Button>
              )}
            </div>

            {/* Time progress bar */}
            <div className="space-y-1">
              <Progress value={durationPercentage} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0m</span>
                <span className={durationPercentage > 100 ? "text-destructive font-semibold" : ""}>
                  {totalDrillsDuration} mins ({durationPercentage}%)
                </span>
                <span>{session.durationMinutes}m capacity</span>
              </div>
            </div>

            {/* Drills List */}
            {resolvedDrillsList.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <span>No drills attached to this training session yet.</span>
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddDrillOpen(true)}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Browse Playbook Drills</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {resolvedDrillsList.map((drill, idx) => (
                  <div
                    key={drill.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/70 hover:bg-card transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm">{drill.title}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {drill.categoryLabel}
                        </Badge>
                        {drill.isCustom && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px]"
                          >
                            Custom
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {drill.difficulty}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {drill.summary}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Timer className="size-3 text-primary" />
                          {drill.durationMinutes} mins
                        </span>
                        {drill.gridDimensions && (
                          <span className="flex items-center gap-1">
                            <Shield className="size-3 text-primary" />
                            Grid: {drill.gridDimensions}
                          </span>
                        )}
                        {drill.equipment && drill.equipment.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Dumbbell className="size-3 text-primary" />
                            {drill.equipment.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInspectDrill(drill)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/tactical-board?drillId=${drill.id}&teamId=${session.teamId}`,
                          )
                        }
                        className="h-8 text-xs font-medium gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        title="Open drill in tactical pitch view"
                      >
                        <Compass className="size-3.5" />
                        <span className="hidden sm:inline">Board</span>
                      </Button>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveDrill(drill.id)}
                          disabled={removingDrillId === drill.id}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove drill from session"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
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
        <>
          <EditSessionDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            session={session}
          />
          <AddSessionDrillDialog
            open={addDrillOpen}
            onOpenChange={setAddDrillOpen}
            sessionId={session._id}
            currentDrillIds={session.drillIds ?? []}
          />
        </>
      )}

      {/* Drill Inspection Modal */}
      <Dialog
        open={Boolean(inspectDrill)}
        onOpenChange={(open) => !open && setInspectDrill(null)}
      >
        <DialogContent className="max-h-[85vh] flex flex-col w-[calc(100vw-2rem)] sm:max-w-xl p-4 sm:p-6 overflow-hidden">
          {inspectDrill && (
            <>
              <DialogHeader className="shrink-0 pb-2">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {inspectDrill.categoryLabel}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {inspectDrill.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    <Timer className="size-3 mr-1 text-primary" />
                    {inspectDrill.durationMinutes} mins
                  </Badge>
                </div>
                <DialogTitle className="font-display text-lg">{inspectDrill.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  {inspectDrill.summary}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2 pr-1 text-xs">
                {/* Tactical Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl border bg-muted/40 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Age Group:</span>
                    <span className="font-semibold text-foreground">{inspectDrill.ageGroup}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Grid Size:</span>
                    <span className="font-semibold text-foreground">{inspectDrill.gridDimensions || "Open pitch"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block">Volume:</span>
                    <span className="font-semibold text-foreground">
                      {inspectDrill.recommendedSets} sets × {inspectDrill.recommendedReps} reps
                    </span>
                  </div>
                </div>

                {/* Equipment */}
                {inspectDrill.equipment && inspectDrill.equipment.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Dumbbell className="size-3.5 text-primary" />
                      Required Equipment
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectDrill.equipment.map((eq, i) => (
                        <Badge key={i} variant="outline" className="text-[11px]">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Setup */}
                {inspectDrill.setup && (
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Layers className="size-3.5 text-primary" />
                      Pitch Setup & Organization
                    </span>
                    <p className="text-muted-foreground leading-relaxed p-2.5 rounded-lg border bg-muted/20">
                      {inspectDrill.setup}
                    </p>
                  </div>
                )}

                {/* Instructions */}
                {inspectDrill.instructions && inspectDrill.instructions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      Execution Steps
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground bg-muted/20 p-2.5 rounded-lg border">
                      {inspectDrill.instructions.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Coaching Points */}
                {inspectDrill.coachingPoints && inspectDrill.coachingPoints.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Target className="size-3.5 text-primary" />
                      Key Tactical Coaching Points
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground bg-primary/5 border border-primary/20 p-2.5 rounded-lg">
                      {inspectDrill.coachingPoints.map((cp, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {cp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-3 border-t flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const drill = inspectDrill;
                    setInspectDrill(null);
                    navigate(`/tactical-board?drillId=${drill.id}&teamId=${session.teamId}`);
                  }}
                  className="h-8 text-xs font-medium gap-1 border-primary/30 text-primary"
                >
                  <Compass className="size-3.5" />
                  <span>Open in Tactical Board</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setInspectDrill(null)}
                  className="h-8 text-xs font-semibold"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Pitch-Side Session Practice Sheet Modal */}
      <SessionSheetExportModal
        open={sheetExportOpen}
        onOpenChange={setSheetExportOpen}
        session={session}
        teamName={teamData?.team?.name}
        preferredFormation={teamData?.team?.preferredFormation}
        roster={roster}
        drills={resolvedDrillsList}
        tacticalPlanDoc={data.tacticalPlan}
      />
    </div>
  );
}
