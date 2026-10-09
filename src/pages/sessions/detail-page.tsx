import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  ErrorState,
  ErrorStateContent,
  ErrorStateDescription,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
} from "@/components/ui/status-state.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { SOCCER_DRILLS, combineAllDrills, type SoccerDrill } from "@/data/soccer-drills.ts";

import EditSessionDialog from "./_components/edit-session-dialog.tsx";
import LiveSessionPerformance from "./_components/live-session-performance.tsx";
import AddSessionDrillDialog from "./_components/add-session-drill-dialog.tsx";
import SessionSheetExportModal from "./_components/session-sheet-export-modal.tsx";
import { SessionHeaderCard } from "./_components/session-header-card.tsx";
import { SessionTacticalRoutine } from "./_components/session-tactical-routine.tsx";
import { SessionDrillItinerary } from "./_components/session-drill-itinerary.tsx";
import {
  SessionAttendanceCard,
  type AttendanceStatus,
} from "./_components/session-attendance-card.tsx";
import { DrillInspectionModal } from "./_components/drill-inspection-modal.tsx";

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Session Top Header Card */}
      <SessionHeaderCard
        session={session}
        start={start}
        end={end}
        canManage={canManage}
        onBack={() => navigate(`/teams/${session.teamId}`)}
        onPrintSheet={() => setSheetExportOpen(true)}
        onKioskMode={() => navigate(`/kiosk/${session._id}`)}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
      />

      {/* Tactical Routine & Playbook Link Card with Drill Itinerary */}
      <div className="space-y-4">
        <SessionTacticalRoutine
          tacticalPlan={data.tacticalPlan}
          tacticalPlans={tacticalPlans}
          teamId={session.teamId}
          canManage={canManage}
          onOpenTacticalBoard={(planId) =>
            navigate(
              planId
                ? `/tactical-board?planId=${planId}&teamId=${session.teamId}`
                : `/tactical-board?teamId=${session.teamId}`,
            )
          }
          onLinkTacticalPlan={async (planId) => {
            try {
              await linkTacticalPlan({
                sessionId: session._id,
                tacticalPlanId: planId,
              });
              toast.success(
                planId
                  ? "Linked tactical plan to session"
                  : "Tactical plan unlinked from session",
              );
            } catch {
              toast.error("Failed to update tactical plan link");
            }
          }}
        />

        <Card>
          <CardContent className="pt-4">
            <SessionDrillItinerary
              session={session}
              resolvedDrillsList={resolvedDrillsList}
              totalDrillsDuration={totalDrillsDuration}
              durationPercentage={durationPercentage}
              canManage={canManage}
              removingDrillId={removingDrillId}
              onAddDrill={() => setAddDrillOpen(true)}
              onInspectDrill={(drill) => setInspectDrill(drill)}
              onOpenBoardForDrill={(drillId) =>
                navigate(`/tactical-board?drillId=${drillId}&teamId=${session.teamId}`)
              }
              onRemoveDrill={handleRemoveDrill}
            />
          </CardContent>
        </Card>
      </div>

      {/* Attendance Tracking Card */}
      <SessionAttendanceCard
        roster={roster}
        attendance={attendance}
        attendanceByAthlete={attendanceByAthlete}
        canManage={canManage}
        onSetStatus={handleSetStatus}
      />

      {/* Live Session Performance Studio */}
      <LiveSessionPerformance
        sessionId={session._id}
        roster={roster}
        attendance={attendance}
        canManage={canManage}
      />

      {/* Dialogs and Modals */}
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
      <DrillInspectionModal
        drill={inspectDrill}
        onClose={() => setInspectDrill(null)}
        onOpenBoard={(drill) => {
          setInspectDrill(null);
          navigate(`/tactical-board?drillId=${drill.id}&teamId=${session.teamId}`);
        }}
      />

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
