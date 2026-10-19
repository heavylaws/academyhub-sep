import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Crosshair,
  Edit2,
  Gauge,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | string;
    if (typeof data === "string") return data;
    if (typeof data?.message === "string") return data.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

interface AthleteIdpCardProps {
  athleteId: Id<"athletes">;
  athleteName: string;
  canManage: boolean;
}

type CornerKey = "physical" | "technical" | "tactical" | "psychological";
type GoalStatus = "in_progress" | "achieved" | "at_risk" | "archived";

interface GoalItem {
  _id: Id<"athleteGoals">;
  academyId: Id<"academies">;
  athleteId: Id<"athletes">;
  createdByUserId: Id<"users">;
  title: string;
  corner: CornerKey;
  linkedMetricName?: string;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  optimizationDirection?: "higher_is_better" | "lower_is_better";
  targetDate: string;
  status: GoalStatus;
  actionPlanNotes?: string;
  creatorName: string;
  athleteName: string;
}

const CORNER_CONFIG: Record<
  CornerKey,
  { label: string; icon: typeof Activity; badgeClass: string }
> = {
  physical: {
    label: "Physical",
    icon: Zap,
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  technical: {
    label: "Technical",
    icon: Crosshair,
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  tactical: {
    label: "Tactical",
    icon: Gauge,
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  psychological: {
    label: "Psychological",
    icon: Brain,
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
};

const STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    icon: Clock,
  },
  achieved: {
    label: "Achieved",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
  },
  at_risk: {
    label: "At Risk",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    icon: AlertTriangle,
  },
  archived: {
    label: "Archived",
    badgeClass: "bg-muted text-muted-foreground border-border",
    icon: Clock,
  },
};

function calculateGoalProgress(
  baseline?: number,
  current?: number,
  target?: number,
  direction: "higher_is_better" | "lower_is_better" = "higher_is_better",
): number {
  if (current === undefined || target === undefined) return 0;
  if (baseline === undefined) {
    if (direction === "lower_is_better") {
      return current <= target ? 100 : Math.max(0, Math.round((target / current) * 100));
    }
    return current >= target ? 100 : Math.max(0, Math.round((current / target) * 100));
  }

  if (direction === "lower_is_better") {
    const totalSpan = baseline - target;
    if (totalSpan <= 0) return current <= target ? 100 : 0;
    const progressSpan = baseline - current;
    return Math.min(100, Math.max(0, Math.round((progressSpan / totalSpan) * 100)));
  }

  const totalSpan = target - baseline;
  if (totalSpan <= 0) return current >= target ? 100 : 0;
  const progressSpan = current - baseline;
  return Math.min(100, Math.max(0, Math.round((progressSpan / totalSpan) * 100)));
}

export function AthleteIdpCard({
  athleteId,
  athleteName,
  canManage,
}: AthleteIdpCardProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [updateGoal, setUpdateGoal] = useState<GoalItem | null>(null);

  const goals = useQuery(api.athleteGoals.listAthleteGoals, { athleteId });
  const createAthleteGoal = useMutation(api.athleteGoals.createAthleteGoal);
  const updateAthleteGoalMutation = useMutation(api.athleteGoals.updateAthleteGoal);
  const deleteAthleteGoal = useMutation(api.athleteGoals.deleteAthleteGoal);

  // Form states for creation
  const [newTitle, setNewTitle] = useState("");
  const [newCorner, setNewCorner] = useState<CornerKey>("physical");
  const [newLinkedMetric, setNewLinkedMetric] = useState("");
  const [newBaseline, setNewBaseline] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newCurrent, setNewCurrent] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newDirection, setNewDirection] = useState<"higher_is_better" | "lower_is_better">("higher_is_better");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for updating value
  const [updateValue, setUpdateValue] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateStatus, setUpdateStatus] = useState<"in_progress" | "achieved" | "at_risk" | "archived">("in_progress");

  const resetCreateForm = () => {
    setNewTitle("");
    setNewCorner("physical");
    setNewLinkedMetric("");
    setNewBaseline("");
    setNewTarget("");
    setNewCurrent("");
    setNewUnit("");
    setNewDirection("higher_is_better");
    setNewTargetDate("");
    setNewNotes("");
  };

  const handleCreateGoal = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a goal title");
      return;
    }
    if (!newTargetDate) {
      toast.error("Please specify a target completion date");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAthleteGoal({
        athleteId,
        title: newTitle.trim(),
        corner: newCorner,
        linkedMetricName: newLinkedMetric.trim() || undefined,
        baselineValue: newBaseline ? Number(newBaseline) : undefined,
        targetValue: newTarget ? Number(newTarget) : undefined,
        currentValue: newCurrent ? Number(newCurrent) : undefined,
        unit: newUnit.trim() || undefined,
        optimizationDirection: newDirection,
        targetDate: newTargetDate,
        actionPlanNotes: newNotes.trim() || undefined,
      });

      toast.success("Individual Development Plan goal created");
      setCreateOpen(false);
      resetCreateForm();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create goal"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!updateGoal) return;
    setIsSubmitting(true);
    try {
      await updateAthleteGoalMutation({
        goalId: updateGoal._id,
        currentValue: updateValue ? Number(updateValue) : undefined,
        status: updateStatus,
        actionPlanNotes: updateNotes.trim() || undefined,
      });

      toast.success("Goal progress recorded");
      setUpdateGoal(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update goal"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: Id<"athleteGoals">) => {
    try {
      await deleteAthleteGoal({ goalId });
      toast.success("IDP goal removed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete goal"));
    }
  };

  if (goals === undefined) {
    return (
      <Card className="border">
        <CardHeader className="pb-3 border-b">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-4 w-80 mt-1" />
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const filteredGoals =
    filterStatus === "all"
      ? goals
      : goals.filter((g) => g.status === filterStatus);

  const activeCount = goals.filter(
    (g) => g.status === "in_progress" || g.status === "at_risk",
  ).length;
  const achievedCount = goals.filter((g) => g.status === "achieved").length;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Individual Development Plans (IDP)
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Personalized 4-corner development objectives, milestone tracking, and action plans.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1">
              <span>{activeCount} Active</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {achievedCount} Achieved
              </span>
            </Badge>

            {canManage && (
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Plus className="size-3.5" />
                <span>New IDP Goal</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b pb-3 overflow-x-auto">
          {["all", "in_progress", "achieved", "at_risk"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {st === "all"
                ? `All Goals (${goals.length})`
                : st === "in_progress"
                  ? `In Progress (${goals.filter((g) => g.status === "in_progress").length})`
                  : st === "achieved"
                    ? `Achieved (${achievedCount})`
                    : `At Risk (${goals.filter((g) => g.status === "at_risk").length})`}
            </button>
          ))}
        </div>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <div className="text-center p-8 rounded-xl border border-dashed text-xs text-muted-foreground space-y-2">
            <Target className="size-8 mx-auto text-muted-foreground/60" />
            <p className="font-medium text-foreground">No development goals matching filter</p>
            <p>
              {canManage
                ? "Establish measurable goals across Physical, Technical, Tactical, or Psychological corners."
                : "Your coaching staff will assign personalized development goals here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredGoals.map((goal) => {
              const cornerCfg = CORNER_CONFIG[goal.corner as CornerKey] ?? CORNER_CONFIG.physical;
              const statusCfg = STATUS_CONFIG[goal.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.in_progress;
              const CornerIcon = cornerCfg.icon;
              const StatusIcon = statusCfg.icon;
              const progressPct = calculateGoalProgress(
                goal.baselineValue,
                goal.currentValue,
                goal.targetValue,
                goal.optimizationDirection,
              );

              return (
                <div
                  key={goal._id}
                  className="rounded-xl border p-4 bg-card hover:bg-muted/20 transition-all flex flex-col justify-between space-y-3.5 shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 gap-1 ${cornerCfg.badgeClass}`}
                        >
                          <CornerIcon className="size-3" />
                          <span>{cornerCfg.label}</span>
                        </Badge>

                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 gap-1 ${statusCfg.badgeClass}`}
                        >
                          <StatusIcon className="size-3" />
                          <span>{statusCfg.label}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUpdateGoal(goal);
                            setUpdateValue(goal.currentValue !== undefined ? String(goal.currentValue) : "");
                            setUpdateNotes(goal.actionPlanNotes || "");
                            setUpdateStatus(goal.status);
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Update Progress"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal._id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete Goal"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                        {goal.title}
                      </h4>
                      {goal.linkedMetricName && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Activity className="size-3 text-primary" />
                          <span>Linked Metric: <strong>{goal.linkedMetricName}</strong></span>
                        </p>
                      )}
                    </div>

                    {goal.actionPlanNotes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border leading-relaxed">
                        {goal.actionPlanNotes}
                      </p>
                    )}
                  </div>

                  {/* Numerical Target & Progress Bar */}
                  {goal.targetValue !== undefined && (
                    <div className="space-y-2 pt-1 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] text-muted-foreground">Current:</span>
                          <span className="font-mono font-bold text-foreground">
                            {goal.currentValue ?? "—"} {goal.unit}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] text-muted-foreground">Target:</span>
                          <span className="font-mono font-bold text-primary">
                            {goal.targetValue} {goal.unit}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>
                            {goal.baselineValue !== undefined
                              ? `Baseline: ${goal.baselineValue} ${goal.unit || ""}`
                              : "Start"}
                          </span>
                          <span className="font-semibold text-foreground">{progressPct}%</span>
                        </div>
                        <Progress
                          value={progressPct}
                          className={`h-1.5 ${
                            goal.status === "achieved"
                              ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                              : "[&>[data-slot=progress-indicator]]:bg-primary"
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>Due: {goal.targetDate}</span>
                    </span>

                    <span className="text-[10px] opacity-80">By {goal.creatorName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog 1: Create New IDP Goal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Individual Development Goal</DialogTitle>
            <DialogDescription>
              Assign a targeted 4-corner objective and milestone for {athleteName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Goal Title *
              </label>
              <Input
                placeholder="e.g. 20m Acceleration Phase under 3.0s"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Corner *
                </label>
                <Select
                  value={newCorner}
                  onValueChange={(val) => setNewCorner(val as CornerKey)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical (Power/Speed/Agility)</SelectItem>
                    <SelectItem value="technical">Technical (Passing/Finishing/Touch)</SelectItem>
                    <SelectItem value="tactical">Tactical (Positioning/Pressing/Vision)</SelectItem>
                    <SelectItem value="psychological">Psychological (Resilience/Focus)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Optimization Direction
                </label>
                <Select
                  value={newDirection}
                  onValueChange={(val) =>
                    setNewDirection(val as "higher_is_better" | "lower_is_better")
                  }
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher_is_better">Higher is better (Jump/Rating)</SelectItem>
                    <SelectItem value="lower_is_better">Lower is better (Sprint/Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Linked Metric (optional)
                </label>
                <Input
                  placeholder="e.g. 20m Sprint"
                  value={newLinkedMetric}
                  onChange={(e) => setNewLinkedMetric(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Unit (optional)
                </label>
                <Input
                  placeholder="e.g. s, cm, bpm, 1-10"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Baseline
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="3.25"
                  value={newBaseline}
                  onChange={(e) => setNewBaseline(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Current
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="3.20"
                  value={newCurrent}
                  onChange={(e) => setNewCurrent(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Target *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="2.95"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Target Completion Date *
              </label>
              <Input
                type="date"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Action Plan & Coaching Notes
              </label>
              <Textarea
                placeholder="Specific training drills, weekly volume targets, or cognitive cues..."
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={handleCreateGoal}
              className="text-xs gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <span>Create Goal</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Quick Update Goal Progress */}
      <Dialog open={!!updateGoal} onOpenChange={(open) => !open && setUpdateGoal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Goal Progress</DialogTitle>
            <DialogDescription>
              Record the latest progress reading for {updateGoal?.title}.
            </DialogDescription>
          </DialogHeader>

          {updateGoal && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Current Value ({updateGoal.unit || "units"})
                </label>
                <Input
                  type="number"
                  step="any"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  className="text-xs"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Target: {updateGoal.targetValue} {updateGoal.unit} (
                  {updateGoal.optimizationDirection === "lower_is_better"
                    ? "lower is better"
                    : "higher is better"}
                  )
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Status
                </label>
                <Select
                  value={updateStatus}
                  onValueChange={(val) => setUpdateStatus(val as GoalStatus)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="achieved">Achieved</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Progress Notes
                </label>
                <Textarea
                  placeholder="Observations or milestone details..."
                  rows={2}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUpdateGoal(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={handleUpdateProgress}
              className="text-xs"
            >
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AthleteIdpCard;
