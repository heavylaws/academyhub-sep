import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  List,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserRound,
  UserRoundPlus,
  Users,
  Compass,
  Shield,
  Shirt,
  LayoutTemplate,
  SlidersHorizontal,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { TacticalPitchSvg } from "@/components/tactical-board/tactical-pitch-svg.tsx";
import {
  FORMATIONS,
  calculateSquadPositionalDepth,
  getPositionCategory,
  type PositionCategory,
} from "@/domain/tactics/tactical-domain.ts";
import EditTeamDialog from "./_components/edit-team-dialog.tsx";
import ManageRosterDialog from "./_components/manage-roster-dialog.tsx";
import ScheduleSessionDialog from "./_components/schedule-session-dialog.tsx";
import SessionCalendar from "./_components/session-calendar.tsx";
import AssignTacticalRoleDialog from "./_components/assign-tactical-role-dialog.tsx";
import EditTeamTacticsDialog from "./_components/edit-team-tactics-dialog.tsx";

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
  const removeTeamMember = useMutation(api.teams.removeTeamMember);

  const [editOpen, setEditOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [tacticsOpen, setTacticsOpen] = useState(false);
  const [roleAthlete, setRoleAthlete] = useState<{
    _id: Id<"athletes">;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    tacticalPosition?: string;
    tacticalRole?: string;
  } | null>(null);
  const [athleteToRemove, setAthleteToRemove] = useState<{
    _id: Id<"athletes">;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [rosterSort, setRosterSort] = useState<"position" | "jersey" | "name">("position");
  const [showPitchPreview, setShowPitchPreview] = useState(true);
  const [sessionView, setSessionView] = useState<"calendar" | "list">(
    "calendar",
  );

  const roster = useMemo(() => data?.roster ?? [], [data?.roster]);
  const team = data?.team;

  const positionalDepth = useMemo(
    () => calculateSquadPositionalDepth(roster),
    [roster],
  );

  const formationPreset = useMemo(() => {
    return (
      FORMATIONS.find((f) => f.value === team?.preferredFormation) ||
      FORMATIONS[0]
    );
  }, [team?.preferredFormation]);

  // Compute sorted roster
  const sortedRoster = useMemo(() => {
    const list = [...roster];
    const categoryOrder: Record<PositionCategory, number> = {
      GK: 0,
      DEF: 1,
      MID: 2,
      FWD: 3,
      OTHER: 4,
    };

    if (rosterSort === "position") {
      return list.sort((a, b) => {
        const catA = getPositionCategory(a.tacticalPosition);
        const catB = getPositionCategory(b.tacticalPosition);
        if (categoryOrder[catA] !== categoryOrder[catB]) {
          return categoryOrder[catA] - categoryOrder[catB];
        }
        if (a.jerseyNumber !== undefined && b.jerseyNumber !== undefined) {
          return a.jerseyNumber - b.jerseyNumber;
        }
        return a.firstName.localeCompare(b.firstName);
      });
    } else if (rosterSort === "jersey") {
      return list.sort((a, b) => {
        if (a.jerseyNumber === undefined) return 1;
        if (b.jerseyNumber === undefined) return -1;
        return a.jerseyNumber - b.jerseyNumber;
      });
    } else {
      return list.sort((a, b) => a.firstName.localeCompare(b.firstName));
    }
  }, [roster, rosterSort]);

  // Match roster athletes to formation slots for the mini-pitch preview
  const lineupSlots = useMemo(() => {
    const slots = formationPreset.slots;
    const remainingAthletes = [...roster];
    const assigned: Array<{
      slot: { role: string; x: number; y: number };
      athlete?: (typeof roster)[0];
    }> = [];

    // First pass: try matching exact or category role
    slots.forEach((slot) => {
      const matchIdx = remainingAthletes.findIndex((ath) => {
        const pos = ath.tacticalPosition?.toUpperCase();
        return (
          pos === slot.role ||
          (pos && getPositionCategory(pos) === getPositionCategory(slot.role))
        );
      });

      if (matchIdx !== -1) {
        assigned.push({ slot, athlete: remainingAthletes[matchIdx] });
        remainingAthletes.splice(matchIdx, 1);
      } else {
        assigned.push({ slot });
      }
    });

    // Second pass: fill empty slots with remaining players
    let remIdx = 0;
    for (
      let i = 0;
      i < assigned.length && remIdx < remainingAthletes.length;
      i++
    ) {
      if (!assigned[i].athlete) {
        assigned[i].athlete = remainingAthletes[remIdx++];
      }
    }

    return assigned;
  }, [formationPreset, roster]);

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

  const handleRemoveAthlete = async () => {
    if (!athleteToRemove || !teamId) return;
    setIsRemoving(true);
    try {
      await removeTeamMember({
        teamId: teamId as Id<"teams">,
        athleteId: athleteToRemove._id,
      });
      toast.success(
        `Removed ${athleteToRemove.firstName} ${athleteToRemove.lastName} from squad`,
      );
      setAthleteToRemove(null);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string })?.message || error.message)
          : "Failed to remove athlete",
      );
    } finally {
      setIsRemoving(false);
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

  if (data === null || !team) {
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
          <p className="text-muted-foreground text-sm">
            {roster.length} {roster.length === 1 ? "athlete" : "athletes"} on
            this team • Playing Base {team.preferredFormation || "4-3-3"}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/tactical-board?teamId=${team._id}`)}
              className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
              title="Launch Tactical Board with this squad pre-deployed"
            >
              <Compass className="size-4 text-primary" />
              <span>Deploy to Board</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
            >
              <CalendarDays className="size-4" />
              <span>Schedule Session</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setRosterOpen(true)}
              className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
            >
              <UserRoundPlus className="size-4" />
              <span>Manage Roster</span>
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

      {/* Squad Positional Depth Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="rounded-xl border bg-card p-3.5 flex flex-col justify-between border-amber-500/20 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Goalkeepers
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {positionalDepth.gk}
            </span>
            {positionalDepth.gk === 0 ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Missing GK
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                Covered
              </Badge>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3.5 flex flex-col justify-between border-blue-500/20 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Defenders
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {positionalDepth.def}
            </span>
            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30 bg-blue-500/10">
              Backline
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3.5 flex flex-col justify-between border-emerald-500/20 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Midfielders
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {positionalDepth.mid}
            </span>
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
              Engine
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3.5 flex flex-col justify-between border-rose-500/20 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Forwards
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {positionalDepth.fwd}
            </span>
            <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-500/30 bg-rose-500/10">
              Attack
            </Badge>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border bg-muted/40 p-3.5 flex flex-col justify-between border-primary/20 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Squad Total
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-bold font-mono text-primary">
              {positionalDepth.total}
            </span>
            <span className="text-xs text-muted-foreground">athletes</span>
          </div>
        </div>
      </div>

      {/* Team Tactical Architecture & Visual Lineup Card */}
      <Card className="border border-border/80 overflow-hidden">
        <CardHeader className="pb-3 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="size-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Tactical Architecture</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                    {team.preferredFormation || "4-3-3"}
                  </Badge>
                </div>
                <CardDescription>
                  Playing shape, starting slots, and primary playbook routine for {team.name}.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPitchPreview(!showPitchPreview)}
                className="h-8 text-xs gap-1"
              >
                {showPitchPreview ? (
                  <>
                    <EyeOff className="size-3.5 text-muted-foreground" />
                    <span>Hide Pitch</span>
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5 text-muted-foreground" />
                    <span>Show Pitch</span>
                  </>
                )}
              </Button>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTacticsOpen(true)}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <LayoutTemplate className="size-3.5" />
                  <span>Configure</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Formation Summary */}
            <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground font-medium">Base Shape</span>
                <p className="font-semibold text-sm">
                  {formationPreset.label}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {formationPreset.category}
              </Badge>
            </div>

            {/* Active Tactical Routine */}
            <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground font-medium">Playbook Routine</span>
                <p className="font-semibold text-sm truncate max-w-[200px]">
                  {data.activeTacticalPlan?.title || "No linked routine"}
                </p>
              </div>
              {data.activeTacticalPlan ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/tactical-board?planId=${data.activeTacticalPlan!._id}&teamId=${team._id}`)}
                  className="h-7 text-xs gap-1"
                >
                  <Compass className="size-3.5" />
                  <span>Launch</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/tactical-board?teamId=${team._id}`)}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Create
                </Button>
              )}
            </div>
          </div>

          {/* Interactive Lineup Pitch Preview */}
          {showPitchPreview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span className="font-medium">
                  Projected Starting Lineup ({formationPreset.slots.length} Slots)
                </span>
                <span className="text-[11px]">
                  Attacking Right →
                </span>
              </div>

              <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-border/80 shadow-inner bg-slate-950">
                <TacticalPitchSvg pitchType="full" />

                {/* Slot markers & Athletes */}
                {lineupSlots.map((item, idx) => {
                  const isGK = item.slot.role === "GK";
                  const athlete = item.athlete;

                  return (
                    <div
                      key={idx}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto transition-transform hover:scale-110 z-10"
                      style={{
                        left: `${item.slot.x}%`,
                        top: `${item.slot.y}%`,
                      }}
                      title={athlete ? `${athlete.firstName} ${athlete.lastName} (${athlete.tacticalRole || item.slot.role})` : `Vacant slot: ${item.slot.role}`}
                    >
                      {athlete ? (
                        <div className="flex flex-col items-center group cursor-pointer">
                          <div
                            className={cn(
                              "size-7 sm:size-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 border-white/90 text-white transition-all",
                              isGK
                                ? "bg-amber-500 hover:bg-amber-400"
                                : "bg-blue-600 hover:bg-blue-500",
                            )}
                          >
                            {athlete.jerseyNumber !== undefined
                              ? athlete.jerseyNumber
                              : idx + 1}
                          </div>
                          <span className="mt-0.5 max-w-[70px] truncate text-[9px] sm:text-[10px] font-semibold text-white px-1 rounded bg-black/70 backdrop-blur-xs leading-tight">
                            {athlete.lastName || athlete.firstName}
                          </span>
                          <span className="text-[8px] font-mono text-emerald-300 font-bold leading-none">
                            {athlete.tacticalPosition || item.slot.role}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center opacity-70 hover:opacity-100">
                          <div className="size-6 sm:size-7 rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-dashed border-white/60 bg-black/40 text-white/80">
                            {item.slot.role}
                          </div>
                          <span className="text-[8px] text-white/70 font-mono mt-0.5">
                            Vacant
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster & Tactical Positions Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Roster & Tactical Positions</CardTitle>
              <CardDescription>
                Assign squad jersey numbers, positions, and tactical duties.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort selector */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
                <Select
                  value={rosterSort}
                  onValueChange={(val) => setRosterSort(val as "position" | "jersey" | "name")}
                >
                  <SelectTrigger className="h-8 text-xs w-[120px]">
                    <SelectValue placeholder="Sort roster" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="position">By Position</SelectItem>
                    <SelectItem value="jersey">By Jersey #</SelectItem>
                    <SelectItem value="name">By Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {canManage && (
                <Button
                  variant="secondary"
                  onClick={() => setRosterOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <UserRoundPlus className="size-3.5" />
                  <span>Manage roster</span>
                </Button>
              )}
            </div>
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
                {sortedRoster.map((athlete) => (
                  <div
                    key={athlete._id}
                    className="flex items-center justify-between p-3"
                  >
                    <Link
                      to={`/athletes/${athlete._id}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-secondary text-xs font-semibold">
                          {athlete.firstName[0]}
                          {athlete.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {athlete.jerseyNumber !== undefined && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono font-bold">
                              #{athlete.jerseyNumber}
                            </Badge>
                          )}
                          <span className="font-semibold text-sm text-foreground truncate">
                            {athlete.firstName} {athlete.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          {athlete.tacticalPosition ? (
                            <span className="font-semibold text-primary">{athlete.tacticalPosition}</span>
                          ) : (
                            <span>{athlete.sport || "Soccer"}</span>
                          )}
                          {athlete.tacticalRole && (
                            <span>• {athlete.tacticalRole}</span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRoleAthlete(athlete)}
                            className="h-8 px-2 text-xs"
                            title="Assign Position & Role"
                          >
                            <Shield className="size-3.5 text-primary" />
                            <span className="sr-only sm:not-sr-only">Role</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAthleteToRemove(athlete)}
                            className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                            title="Remove from squad"
                          >
                            <UserMinus className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No.</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Tactical Position</TableHead>
                      <TableHead>Tactical Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRoster.map((athlete) => (
                      <TableRow key={athlete._id}>
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                          {athlete.jerseyNumber !== undefined ? `#${athlete.jerseyNumber}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/athletes/${athlete._id}`}
                            className="flex items-center gap-3 hover:underline"
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
                        <TableCell>
                          {athlete.tacticalPosition ? (
                            <Badge variant="outline" className="font-semibold text-xs border-primary/40 text-primary">
                              {athlete.tacticalPosition}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {athlete.tacticalRole ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRoleAthlete(athlete)}
                                className="h-8 text-xs gap-1"
                              >
                                <Shield className="size-3.5 text-primary" />
                                <span>Assign Role</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAthleteToRemove(athlete)}
                                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                title="Remove athlete from squad"
                              >
                                <UserMinus className="size-3.5" />
                              </Button>
                            </div>
                          )}
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
          <EditTeamTacticsDialog
            open={tacticsOpen}
            onOpenChange={setTacticsOpen}
            teamId={team._id}
            currentFormation={team.preferredFormation}
            currentPlanId={team.activeTacticalPlanId}
          />
          <AssignTacticalRoleDialog
            open={Boolean(roleAthlete)}
            onOpenChange={(open) => !open && setRoleAthlete(null)}
            teamId={team._id}
            athlete={roleAthlete}
          />
          <AlertDialog
            open={Boolean(athleteToRemove)}
            onOpenChange={(open) => !open && setAthleteToRemove(null)}
          >
            <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove athlete from squad?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove{" "}
                  <span className="font-semibold text-foreground">
                    {athleteToRemove?.firstName} {athleteToRemove?.lastName}
                  </span>{" "}
                  from this squad? Their profile and academy records will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleRemoveAthlete}
                  disabled={isRemoving}
                >
                  {isRemoving ? "Removing..." : "Remove from squad"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
