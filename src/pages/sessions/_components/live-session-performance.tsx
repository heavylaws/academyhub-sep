import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  FastForward,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { cn } from "@/lib/utils.ts";

export interface MetricPreset {
  id: string;
  name: string;
  unit: string;
  category: "speed" | "power" | "technical" | "readiness" | "custom";
  step: number;
  min?: number;
  max?: number;
  ratingPresets?: number[];
  lowerIsBetter?: boolean;
}

const PRESET_METRICS: MetricPreset[] = [
  {
    id: "sprint_40m",
    name: "Sprint 40m (s)",
    unit: "s",
    category: "speed",
    step: 0.05,
    lowerIsBetter: true,
  },
  {
    id: "sprint_10m",
    name: "10m Acceleration (s)",
    unit: "s",
    category: "speed",
    step: 0.02,
    lowerIsBetter: true,
  },
  {
    id: "shuttle_5105",
    name: "5-10-5 Pro Agility (s)",
    unit: "s",
    category: "speed",
    step: 0.05,
    lowerIsBetter: true,
  },
  {
    id: "vert_jump",
    name: "Vertical Jump (cm)",
    unit: "cm",
    category: "power",
    step: 1,
    lowerIsBetter: false,
  },
  {
    id: "broad_jump",
    name: "Broad Jump (m)",
    unit: "m",
    category: "power",
    step: 0.05,
    lowerIsBetter: false,
  },
  {
    id: "beep_test",
    name: "Beep Test (Level)",
    unit: "lvl",
    category: "power",
    step: 0.5,
    lowerIsBetter: false,
  },
  {
    id: "passing_accuracy",
    name: "Passing Drill Accuracy (%)",
    unit: "%",
    category: "technical",
    step: 5,
    min: 0,
    max: 100,
    ratingPresets: [60, 70, 80, 90, 100],
    lowerIsBetter: false,
  },
  {
    id: "target_shots",
    name: "Target Finishes (Made / 10)",
    unit: "made",
    category: "technical",
    step: 1,
    min: 0,
    max: 10,
    ratingPresets: [5, 6, 7, 8, 9, 10],
    lowerIsBetter: false,
  },
  {
    id: "drill_rating",
    name: "Coach Technique Rating (1-5)",
    unit: "stars",
    category: "readiness",
    step: 1,
    min: 1,
    max: 5,
    ratingPresets: [1, 2, 3, 4, 5],
    lowerIsBetter: false,
  },
  {
    id: "session_rpe",
    name: "Session RPE / Effort (1-10)",
    unit: "scale",
    category: "readiness",
    step: 1,
    min: 1,
    max: 10,
    ratingPresets: [3, 5, 7, 8, 9, 10],
    lowerIsBetter: false,
  },
];

export interface SessionRosterAthlete {
  _id: string;
  firstName: string;
  lastName: string;
  sport?: string;
  email?: string;
}

export interface SessionAttendanceItem {
  athleteId: string;
  status: string;
}

interface LiveSessionPerformanceProps {
  sessionId: Id<"trainingSessions">;
  roster: SessionRosterAthlete[];
  attendance: SessionAttendanceItem[];
  canManage: boolean;
}

export default function LiveSessionPerformance({
  sessionId,
  roster,
  attendance,
  canManage,
}: LiveSessionPerformanceProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("sprint_40m");
  const [customMetricName, setCustomMetricName] = useState("");
  const [customMetricUnit, setCustomMetricUnit] = useState("");
  const [onlyCheckedIn, setOnlyCheckedIn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-session draft entries keyed by athleteId
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  // Input refs for instant auto-advance on Enter or ArrowDown
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Mutations & Queries
  const recordBatchMutation = useMutation(
    api.assessments.recordBatchSessionAssessments,
  );
  const deleteAssessmentMutation = useMutation(api.assessments.deleteAssessment);
  const sessionAssessments = useQuery(
    api.assessments.listAssessmentsForSession,
    { sessionId },
  );

  const activePreset = useMemo(() => {
    return PRESET_METRICS.find((p) => p.id === selectedPresetId);
  }, [selectedPresetId]);

  const activeMetricName = useMemo(() => {
    if (selectedPresetId === "custom") {
      return customMetricName.trim() || "Custom Drill";
    }
    return activePreset?.name || "Sprint 40m (s)";
  }, [selectedPresetId, customMetricName, activePreset]);

  const activeMetricUnit = useMemo(() => {
    if (selectedPresetId === "custom") {
      return customMetricUnit.trim();
    }
    return activePreset?.unit || "";
  }, [selectedPresetId, customMetricUnit, activePreset]);

  // Attendance lookup
  const attendanceMap = useMemo(() => {
    return new Map(attendance.map((a) => [a.athleteId, a.status]));
  }, [attendance]);

  // Filter roster
  const displayedAthletes = useMemo(() => {
    if (!onlyCheckedIn) return roster;
    return roster.filter((ath) => {
      const status = attendanceMap.get(ath._id);
      return status === "present" || status === "late";
    });
  }, [roster, onlyCheckedIn, attendanceMap]);

  // Handle value change for an athlete
  const handleValueChange = (athleteId: string, val: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [athleteId]: val,
    }));
  };

  // Keyboard navigation: Enter or ArrowDown moves to next athlete
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number,
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextAthlete = displayedAthletes[currentIndex + 1];
      if (nextAthlete && inputRefs.current[nextAthlete._id]) {
        inputRefs.current[nextAthlete._id]?.focus();
        inputRefs.current[nextAthlete._id]?.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevAthlete = displayedAthletes[currentIndex - 1];
      if (prevAthlete && inputRefs.current[prevAthlete._id]) {
        inputRefs.current[prevAthlete._id]?.focus();
        inputRefs.current[prevAthlete._id]?.select();
      }
    }
  };

  // Stepper adjustments
  const adjustValue = (athleteId: string, delta: number) => {
    const current = parseFloat(draftValues[athleteId] || "0");
    const step = activePreset?.step || 1;
    const nextVal = Math.max(0, current + delta * step);
    const decimals = step < 1 ? (step.toString().split(".")[1]?.length || 2) : 0;
    handleValueChange(athleteId, nextVal.toFixed(decimals));
  };

  // Count entered
  const enteredCount = useMemo(() => {
    return Object.values(draftValues).filter(
      (v) => v.trim() !== "" && !isNaN(parseFloat(v)),
    ).length;
  }, [draftValues]);

  // Submit batch
  const handleRecordBatch = async () => {
    if (!canManage) return;
    const entries: Array<{
      athleteId: Id<"athletes">;
      value: number;
      notes?: string;
    }> = [];

    for (const ath of displayedAthletes) {
      const valStr = draftValues[ath._id];
      if (valStr && valStr.trim() !== "" && !isNaN(parseFloat(valStr))) {
        entries.push({
          athleteId: ath._id as Id<"athletes">,
          value: parseFloat(valStr),
          notes: draftNotes[ath._id]?.trim() || undefined,
        });
      }
    }

    if (entries.length === 0) {
      toast.error("Please enter results for at least one athlete");
      return;
    }

    setIsSubmitting(true);
    try {
      const todayIso = new Date().toISOString().split("T")[0];
      const res = await recordBatchMutation({
        sessionId,
        metric: activeMetricName,
        unit: activeMetricUnit,
        assessedOn: todayIso,
        entries,
      });

      toast.success(
        `Recorded ${res.count} result${res.count > 1 ? "s" : ""} for ${activeMetricName}!`,
      );
      // Clear entered values
      setDraftValues({});
      setDraftNotes({});
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record session performance",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group recorded session assessments by metric
  const assessmentsByMetric = useMemo(() => {
    if (!sessionAssessments) return [];
    const map = new Map<
      string,
      Array<typeof sessionAssessments[number]>
    >();

    for (const a of sessionAssessments) {
      const list = map.get(a.metric) || [];
      list.push(a);
      map.set(a.metric, list);
    }

    return Array.from(map.entries()).map(([metric, list]) => {
      // Determine if lower is better for this metric
      const lowerIsBetter =
        (PRESET_METRICS.find((p) => p.name === metric)?.lowerIsBetter) ??
        (metric.toLowerCase().includes("sprint") ||
          metric.toLowerCase().includes("(s)"));

      const sorted = [...list].sort((x, y) =>
        lowerIsBetter ? x.value - y.value : y.value - x.value,
      );

      const sum = sorted.reduce((acc, curr) => acc + curr.value, 0);
      const avg = sorted.length > 0 ? (sum / sorted.length).toFixed(2) : "0";
      const best = sorted[0];

      return {
        metric,
        unit: list[0]?.unit || "",
        items: sorted,
        avg,
        best,
        lowerIsBetter,
      };
    });
  }, [sessionAssessments]);

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="size-5" />
            </div>
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                Live Session Performance
                <Badge variant="secondary" className="font-mono text-xs">
                  Rapid Input
                </Badge>
              </CardTitle>
              <CardDescription>
                Quickly log drill times, jump metrics, accuracy, or intensity scores
                for the squad in real time.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={onlyCheckedIn ? "secondary" : "outline"}
              size="sm"
              onClick={() => setOnlyCheckedIn((prev) => !prev)}
              className="text-xs gap-1.5"
            >
              <Users className="size-3.5" />
              {onlyCheckedIn ? "Checked-In Only" : "Entire Roster"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metric Preset Selector Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Target className="size-3.5 text-primary" />
              1. Select Drill or Testing Metric
            </span>
            {activePreset && (
              <span className="text-primary font-medium">
                Unit: {activePreset.unit || "N/A"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_METRICS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setDraftValues({});
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  selectedPresetId === preset.id
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {preset.name}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setSelectedPresetId("custom");
                setDraftValues({});
              }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1",
                selectedPresetId === "custom"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Plus className="size-3" />
              Custom Drill
            </button>
          </div>

          {/* Custom Metric Input Form */}
          {selectedPresetId === "custom" && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <div>
                <label className="text-xs font-medium text-foreground">
                  Custom Drill / Metric Name
                </label>
                <Input
                  placeholder="e.g., Shuttle 300m, Plank Time, Dribble Maze"
                  value={customMetricName}
                  onChange={(e) => setCustomMetricName(e.target.value)}
                  className="mt-1 bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Unit of Measurement
                </label>
                <Input
                  placeholder="e.g., s, reps, pts, score"
                  value={customMetricUnit}
                  onChange={(e) => setCustomMetricUnit(e.target.value)}
                  className="mt-1 bg-background text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rapid Roster Data Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-primary" />
              2. Enter Group Results ({displayedAthletes.length} athletes)
            </span>
            <span className="text-muted-foreground">
              Tip: Press <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Enter</kbd> or <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↓</kbd> to jump to next athlete
            </span>
          </div>

          {displayedAthletes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No athletes found.{" "}
              {onlyCheckedIn && "No athletes are checked in yet. Toggle 'Entire Roster' or check in athletes above."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/80 bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[200px]">Athlete</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[220px]">
                      Result ({activeMetricUnit || "value"})
                    </TableHead>
                    <TableHead className="min-w-[150px]">Quick Note / Tag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAthletes.map((ath, index) => {
                    const status = attendanceMap.get(ath._id);
                    const currentVal = draftValues[ath._id] || "";
                    const currentNote = draftNotes[ath._id] || "";

                    return (
                      <TableRow key={ath._id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7">
                              <AvatarFallback className="bg-secondary text-xs">
                                {ath.firstName[0]}
                                {ath.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium leading-none">
                                {ath.firstName} {ath.lastName}
                              </div>
                              {ath.sport && (
                                <span className="text-[11px] text-muted-foreground">
                                  {ath.sport}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {status === "present" ? (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0">
                              Present
                            </Badge>
                          ) : status === "late" ? (
                            <Badge variant="outline" className="text-[10px] px-2 py-0 text-amber-500 border-amber-500/40">
                              Late
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground">
                              Not Checked
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Direct numeric input with auto-advance */}
                            <div className="relative flex items-center">
                              <Input
                                ref={(el) => {
                                  inputRefs.current[ath._id] = el;
                                }}
                                type="number"
                                step={activePreset?.step || "any"}
                                placeholder="0.00"
                                value={currentVal}
                                onChange={(e) =>
                                  handleValueChange(ath._id, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                disabled={!canManage}
                                className={cn(
                                  "h-9 w-28 text-center font-mono font-semibold text-sm transition-all",
                                  currentVal
                                    ? "border-primary/80 bg-primary/5 text-primary"
                                    : "bg-background",
                                )}
                              />
                              {activeMetricUnit && (
                                <span className="pointer-events-none absolute right-2 text-[11px] font-medium text-muted-foreground">
                                  {activeMetricUnit}
                                </span>
                              )}
                            </div>

                            {/* Steppers (+ / -) */}
                            {canManage && (
                              <div className="flex items-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => adjustValue(ath._id, 1)}
                                  title="Increase score"
                                >
                                  <ChevronUp className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => adjustValue(ath._id, -1)}
                                  title="Decrease score"
                                >
                                  <ChevronDown className="size-3.5" />
                                </Button>
                              </div>
                            )}

                            {/* Preset Buttons for ratings / fast touches */}
                            {canManage &&
                              activePreset?.ratingPresets && (
                                <div className="hidden sm:flex items-center gap-1">
                                  {activePreset.ratingPresets.map((rVal) => (
                                    <button
                                      key={rVal}
                                      type="button"
                                      onClick={() =>
                                        handleValueChange(
                                          ath._id,
                                          rVal.toString(),
                                        )
                                      }
                                      className={cn(
                                        "size-6 rounded border text-[11px] font-semibold transition-colors",
                                        currentVal === rVal.toString()
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-accent",
                                      )}
                                    >
                                      {rVal}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Input
                            placeholder="Optional note (e.g. PR, tired)"
                            value={currentNote}
                            onChange={(e) =>
                              setDraftNotes((prev) => ({
                                ...prev,
                                [ath._id]: e.target.value,
                              }))
                            }
                            disabled={!canManage}
                            className="h-8 text-xs bg-background"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Action Row */}
          {canManage && displayedAthletes.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraftValues({});
                    setDraftNotes({});
                  }}
                  disabled={enteredCount === 0 || isSubmitting}
                  className="text-xs text-muted-foreground gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Clear Entries
                </Button>
              </div>

              <Button
                onClick={handleRecordBatch}
                disabled={enteredCount === 0 || isSubmitting}
                className="gap-2 font-semibold shadow-sm"
              >
                <FastForward className="size-4" />
                {isSubmitting
                  ? "Saving to Session..."
                  : `Save Results (${enteredCount} entered)`}
              </Button>
            </div>
          )}
        </div>

        {/* Live Session Drill Leaderboard / History */}
        {assessmentsByMetric.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-amber-500" />
                <h4 className="text-sm font-semibold tracking-wide">
                  Drills Completed This Session ({sessionAssessments?.length || 0} scores)
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessmentsByMetric.map((group) => (
                <div
                  key={group.metric}
                  className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-foreground">
                        {group.metric}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>Squad Avg: <strong>{group.avg} {group.unit}</strong></span>
                        <span>•</span>
                        <span>Tested: {group.items.length}</span>
                      </div>
                    </div>

                    {group.best && (
                      <Badge
                        variant="secondary"
                        className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs py-1"
                      >
                        <Award className="size-3.5" />
                        Top: {group.best.athleteName} ({group.best.value} {group.unit})
                      </Badge>
                    )}
                  </div>

                  {/* Leaderboard rows */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {group.items.map((item, idx) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-1.5 text-xs border border-border/40"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full font-bold text-[10px]",
                              idx === 0
                                ? "bg-amber-500 text-white"
                                : idx === 1
                                ? "bg-slate-300 text-slate-800"
                                : idx === 2
                                ? "bg-amber-700 text-white"
                                : "text-muted-foreground",
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground">
                            {item.athleteName}
                          </span>
                          {item.notes && (
                            <span className="text-[11px] text-muted-foreground italic">
                              "{item.notes}"
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">
                            {item.value} {group.unit}
                          </span>
                          {canManage && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await deleteAssessmentMutation({
                                    assessmentId: item._id as Id<"assessments">,
                                  });
                                  toast.success("Result removed");
                                } catch {
                                  toast.error("Failed to delete result");
                                }
                              }}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                              title="Delete result"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
