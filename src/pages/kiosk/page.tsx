import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  KeyRound,
  LayoutGrid,
  Loader2,
  MonitorCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { playCheckInChime } from "@/lib/audio-chime.ts";
import {
  enqueueOfflineCheckIn,
  flushOfflineQueue,
} from "@/lib/kiosk-offline-queue.ts";
import { KioskHeader } from "./_components/kiosk-header.tsx";
import {
  CheckInSuccessModal,
  type CheckInSuccessData,
} from "./_components/check-in-success-modal.tsx";
import {
  KioskRosterGrid,
  type KioskRosterAthlete,
} from "./_components/kiosk-roster-grid.tsx";
import { KioskPinKeypad } from "./_components/kiosk-pin-keypad.tsx";
import { CoachMonitorView } from "./_components/coach-monitor-view.tsx";
import LiveSessionPerformance from "../sessions/_components/live-session-performance.tsx";

export default function KioskPage() {
  const { sessionId: paramSessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();

  const todaySessions = useQuery(api.trainingSessions.listTodaySessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [successData, setSuccessData] = useState<CheckInSuccessData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "roster" | "keypad" | "monitor" | "drills"
  >("roster");

  // Active session ID resolution: param > state > first today session
  const activeSessionId = useMemo(() => {
    if (paramSessionId) return paramSessionId;
    if (selectedSessionId) return selectedSessionId;
    if (todaySessions && todaySessions.length > 0) return todaySessions[0]._id;
    return null;
  }, [paramSessionId, selectedSessionId, todaySessions]);

  const kioskData = useQuery(
    api.trainingSessions.getSessionKioskRoster,
    activeSessionId
      ? { sessionId: activeSessionId as Id<"trainingSessions"> }
      : "skip",
  );

  const checkInMutation = useMutation(api.trainingSessions.checkInAthlete);
  const undoCheckInMutation = useMutation(api.trainingSessions.undoCheckIn);
  const setAttendanceMutation = useMutation(api.trainingSessions.setAttendance);

  const handleSyncOffline = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await flushOfflineQueue(async (args) => {
        return await checkInMutation({
          sessionId: args.sessionId as Id<"trainingSessions">,
          athleteId: args.athleteId as Id<"athletes"> | undefined,
          pin: args.pin,
        });
      });
      if (res.synced > 0) {
        toast.success(`Synced ${res.synced} offline check-in${res.synced > 1 ? "s" : ""}`);
      }
      if (res.failed > 0) {
        toast.error(`Could not sync ${res.failed} check-in(s)`);
      }
    } catch {
      toast.error("Offline sync encountered an error");
    } finally {
      setIsSyncing(false);
    }
  }, [checkInMutation]);

  useEffect(() => {
    const handleOnline = () => {
      handleSyncOffline();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [handleSyncOffline]);

  const handleCheckIn = async (athleteId?: string, pin?: string) => {
    if (!activeSessionId) return false;

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    if (!isOnline) {
      const rosterAthlete = athleteId
        ? kioskData?.roster.find((a) => a._id === athleteId)
        : undefined;
      const athleteName = rosterAthlete
        ? `${rosterAthlete.firstName} ${rosterAthlete.lastName}`
        : pin
        ? `Athlete (PIN ${pin})`
        : "Athlete";

      enqueueOfflineCheckIn({
        sessionId: activeSessionId,
        athleteId,
        pin,
        athleteName,
      });

      if (audioEnabled) {
        playCheckInChime();
      }

      setSuccessData({
        athlete: {
          _id: (athleteId ?? "ath_offline") as Id<"athletes">,
          firstName: rosterAthlete?.firstName ?? "Athlete",
          lastName: rosterAthlete?.lastName ?? (pin ? `(PIN ${pin})` : ""),
        },
        status: "present",
        recordedAt: new Date().toISOString(),
        sessionTitle: `${kioskData?.session.title ?? "Training Session"} (Offline Saved)`,
      });

      toast.warning("Checked in offline. Will sync automatically once reconnected.");
      return true;
    }

    try {
      const res = await checkInMutation({
        sessionId: activeSessionId as Id<"trainingSessions">,
        athleteId: athleteId as Id<"athletes"> | undefined,
        pin,
      });

      if (res && res.success) {
        if (audioEnabled) {
          playCheckInChime();
        }

        setSuccessData({
          athlete: res.athlete,
          status: res.status as "present" | "late",
          recordedAt: res.recordedAt,
          sessionTitle: kioskData?.session.title ?? "Training Session",
        });

        toast.success(
          `${res.athlete.firstName} checked in (${res.status === "late" ? "Late" : "On Time"})`,
        );
        return true;
      }
      return false;
    } catch (err: unknown) {
      // If network error occurred mid-request, enqueue offline
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch") ||
        !navigator.onLine
      ) {
        enqueueOfflineCheckIn({
          sessionId: activeSessionId,
          athleteId,
          pin,
        });
        if (audioEnabled) {
          playCheckInChime();
        }
        toast.warning("Network dropped. Check-in saved offline.");
        return true;
      }
      toast.error(msg);
      return false;
    }
  };

  const handleUndo = async (athleteId: string) => {
    if (!activeSessionId) return;
    try {
      await undoCheckInMutation({
        sessionId: activeSessionId as Id<"trainingSessions">,
        athleteId: athleteId as Id<"athletes">,
      });
      toast.info("Check-in undone");
    } catch {
      toast.error("Failed to undo check-in");
    }
  };

  const handleSetStatus = async (
    athleteId: string,
    status: "present" | "late" | "absent" | "excused",
  ) => {
    if (!activeSessionId) return;
    try {
      await setAttendanceMutation({
        sessionId: activeSessionId as Id<"trainingSessions">,
        athleteId: athleteId as Id<"athletes">,
        status,
      });
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleBulkMarkAbsent = async () => {
    if (!kioskData) return;
    const unrecorded = kioskData.roster.filter(
      (a) => a.status === "unrecorded",
    );

    for (const a of unrecorded) {
      try {
        await setAttendanceMutation({
          sessionId: activeSessionId as Id<"trainingSessions">,
          athleteId: a._id as Id<"athletes">,
          status: "absent",
        });
      } catch {
        // Ignored in loop
      }
    }
    toast.success(`Marked ${unrecorded.length} athletes as absent`);
  };

  // Loading state
  if (todaySessions === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no session found
  if (!activeSessionId && todaySessions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <KioskHeader
          currentSessionId=""
          sessions={[]}
          onSelectSession={() => {}}
          audioEnabled={audioEnabled}
          onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md p-10 text-center rounded-3xl border border-border shadow-xl">
            <Calendar className="mx-auto size-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-2xl font-display font-extrabold text-foreground">
              No Sessions Today
            </h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              There are no active training sessions scheduled for today in this academy.
            </p>
            <Button
              onClick={() => navigate("/schedule")}
              className="w-full rounded-xl h-11 font-semibold"
            >
              View Academy Schedule
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background/95 select-none">
      {/* Kiosk Header */}
      <KioskHeader
        currentSessionId={activeSessionId ?? ""}
        sessions={todaySessions}
        onSelectSession={(id) => {
          setSelectedSessionId(id);
          navigate(`/kiosk/${id}`);
        }}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        onSyncOffline={handleSyncOffline}
        isSyncing={isSyncing}
      />

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl mx-auto w-full">
        {kioskData === undefined ? (
          <div className="space-y-6">
            <div className="h-16 w-full rounded-2xl bg-muted/50 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Session Headline Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-card p-6 border border-border shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {kioskData.session.teamName}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {kioskData.session.durationMinutes} min session
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-foreground">
                  {kioskData.session.title}
                </h1>
                {kioskData.session.location && (
                  <p className="text-xs font-medium text-muted-foreground">
                    📍 {kioskData.session.location}
                  </p>
                )}
              </div>

              {/* Attendance Pill Stats */}
              <div className="flex items-center gap-4 bg-muted/40 p-3.5 rounded-2xl border border-border/60">
                <div className="text-right">
                  <span className="block text-2xl font-display font-extrabold text-foreground leading-tight">
                    {kioskData.stats.present + kioskData.stats.late} / {kioskData.stats.total}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Checked In ({kioskData.stats.percentCheckedIn}%)
                  </span>
                </div>
                <div className="size-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-display font-bold text-xs text-foreground bg-emerald-500/10">
                  {kioskData.stats.percentCheckedIn}%
                </div>
              </div>
            </div>

            {/* View Mode Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="w-full space-y-6"
            >
              <div className="flex justify-center">
                <TabsList className="h-14 p-1.5 rounded-2xl bg-card border border-border shadow-sm">
                  <TabsTrigger
                    value="roster"
                    className="h-11 px-6 rounded-xl font-bold text-sm gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                  >
                    <LayoutGrid className="size-4" />
                    <span>1-Tap Roster</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="keypad"
                    className="h-11 px-6 rounded-xl font-bold text-sm gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                  >
                    <KeyRound className="size-4" />
                    <span>Keypad PIN</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="monitor"
                    className="h-11 px-6 rounded-xl font-bold text-sm gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                  >
                    <MonitorCheck className="size-4" />
                    <span>Coach Monitor</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="drills"
                    className="h-11 px-6 rounded-xl font-bold text-sm gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                  >
                    <Zap className="size-4" />
                    <span>Live Drills</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: 1-Tap Touch Roster */}
              <TabsContent value="roster" className="mt-0 focus-visible:outline-none">
                <KioskRosterGrid
                  roster={kioskData.roster as KioskRosterAthlete[]}
                  onCheckIn={(id) => handleCheckIn(id)}
                  onUndo={handleUndo}
                />
              </TabsContent>

              {/* Tab 2: Keypad PIN */}
              <TabsContent value="keypad" className="mt-0 focus-visible:outline-none">
                <Card className="p-8 rounded-3xl border border-border shadow-md max-w-md mx-auto">
                  <KioskPinKeypad
                    onSubmitPin={async (pin) => {
                      const success = await handleCheckIn(undefined, pin);
                      return success;
                    }}
                  />
                </Card>
              </TabsContent>

              {/* Tab 3: Coach Monitor */}
              <TabsContent value="monitor" className="mt-0 focus-visible:outline-none">
                <CoachMonitorView
                  roster={kioskData.roster as KioskRosterAthlete[]}
                  stats={kioskData.stats}
                  onSetStatus={handleSetStatus}
                  onBulkMarkAbsent={handleBulkMarkAbsent}
                />
              </TabsContent>

              {/* Tab 4: Live Session Performance & Drills */}
              <TabsContent value="drills" className="mt-0 focus-visible:outline-none">
                <LiveSessionPerformance
                  sessionId={activeSessionId as Id<"trainingSessions">}
                  roster={kioskData.roster}
                  attendance={kioskData.roster.map((a) => ({
                    athleteId: a._id,
                    status: a.status,
                  }))}
                  canManage={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Celebratory Check-In Success Modal */}
      <CheckInSuccessModal
        data={successData}
        onDismiss={() => setSuccessData(null)}
      />
    </div>
  );
}
