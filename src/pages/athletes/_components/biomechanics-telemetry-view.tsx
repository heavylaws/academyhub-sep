import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Dumbbell,
  Gauge,
  Plus,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
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

export type StructuredTelemetry = NonNullable<
  Doc<"videoAnalyses">["structuredTelemetry"]
>;

interface BiomechanicsTelemetryViewProps {
  analysisId: Id<"videoAnalyses">;
  athleteId: Id<"athletes">;
  telemetry: StructuredTelemetry;
  appliedToPlanId?: Id<"trainingPlans">;
  canManage: boolean;
  onPlanApplied?: (planId: Id<"trainingPlans">) => void;
}

export default function BiomechanicsTelemetryView({
  analysisId,
  athleteId,
  telemetry,
  appliedToPlanId,
  canManage,
  onPlanApplied,
}: BiomechanicsTelemetryViewProps) {
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedPlanMode, setSelectedPlanMode] = useState<"new" | "existing">("new");
  const [selectedExistingPlanId, setSelectedExistingPlanId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  const athletePlans = useQuery(
    api.trainingPlans.listPlansForAthlete,
    athleteId ? { athleteId } : "skip",
  );

  const applyDrillsMutation = useMutation(
    api.videoAnalyses.applyCorrectiveDrillsToPlan,
  );

  const activePlans = (athletePlans || []).filter((p) => p.status === "active");

  const score = telemetry.overallBiomechanicsScore;
  const scoreConfig =
    score >= 80
      ? {
          color: "text-emerald-500",
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/10",
          badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          label: "Optimal Efficiency",
        }
      : score >= 65
        ? {
            color: "text-amber-500",
            border: "border-amber-500/30",
            bg: "bg-amber-500/10",
            badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
            label: "Moderate Compensation",
          }
        : {
            color: "text-rose-500",
            border: "border-rose-500/30",
            bg: "bg-rose-500/10",
            badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
            label: "Elevated Injury Risk",
          };

  const handleApplyToPlan = async () => {
    setIsApplying(true);
    try {
      const targetPlanId =
        selectedPlanMode === "existing" && selectedExistingPlanId
          ? (selectedExistingPlanId as Id<"trainingPlans">)
          : undefined;

      const res = await applyDrillsMutation({
        analysisId,
        targetPlanId,
      });

      toast.success(
        `Added ${res.addedDrillsCount} corrective drill(s) to training plan`,
      );
      setApplyModalOpen(false);
      if (onPlanApplied) {
        onPlanApplied(res.planId);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ConvexError
          ? String((err.data as { message?: string })?.message || "Failed to link drills")
          : err instanceof Error
            ? err.message
            : "Failed to link corrective drills";
      toast.error(msg);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* 1. Header Overview & Biomechanics Score */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
        <div className={`md:col-span-4 rounded-xl border ${scoreConfig.border} ${scoreConfig.bg} p-4 flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Biomechanics Score
            </span>
            <Gauge className={`size-4 ${scoreConfig.color}`} />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl font-extrabold font-mono tracking-tight ${scoreConfig.color}`}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground font-medium">/ 100</span>
            </div>
            <p className="text-xs font-medium mt-1 text-foreground/90">
              {scoreConfig.label}
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">
            Composite evaluation of kinetic chain alignment, angle deviation, and landing force attenuation.
          </div>
        </div>

        <div className="md:col-span-8 rounded-xl border bg-card/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Kinetic Flaw Summary
              </span>
              {appliedToPlanId ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                  <CheckCircle2 className="size-3" />
                  Applied to Training Plan
                </Badge>
              ) : canManage ? (
                <Button
                  size="sm"
                  onClick={() => setApplyModalOpen(true)}
                  className="h-7 text-xs gap-1.5 shadow-sm"
                >
                  <Dumbbell className="size-3.5" />
                  Apply Drills to Plan
                </Button>
              ) : null}
            </div>

            {telemetry.detectedFlaws.length > 0 ? (
              <ul className="space-y-1.5">
                {telemetry.detectedFlaws.map((flaw, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-foreground/90"
                  >
                    <span className="mt-0.5 size-3.5 shrink-0 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[9px] font-bold">
                      !
                    </span>
                    <span>{flaw}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No acute kinetic flaws or compensatory movements detected.
              </p>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{telemetry.jointAngles.length} Key Joint Angles Tracked</span>
            <span>{telemetry.recommendedCorrectiveDrills.length} Corrective Exercises Prescribed</span>
          </div>
        </div>
      </div>

      {/* 2. Joint Angles Telemetry Table */}
      {telemetry.jointAngles.length > 0 && (
        <div className="rounded-xl border bg-card/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="size-3.5 text-primary" />
              Joint Angle Telemetry & Deviation
            </span>
            <span className="text-[11px] text-muted-foreground">
              Range vs. Optimal Ideal Target
            </span>
          </div>
          <div className="divide-y text-xs">
            {telemetry.jointAngles.map((joint, idx) => {
              const statusCfg =
                joint.deviationStatus === "optimal"
                  ? {
                      badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                      label: "Optimal",
                    }
                  : joint.deviationStatus === "suboptimal"
                    ? {
                        badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                        label: "Suboptimal",
                      }
                    : {
                        badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                        label: "Critical Risk",
                      };

              return (
                <div
                  key={idx}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-medium text-foreground block truncate">
                      {joint.jointName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Target Range: {joint.idealRangeDeg}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-semibold text-sm">
                      {joint.measuredAngleDeg}°
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0.5 font-medium ${statusCfg.badge}`}
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Keyframe Movement Phases */}
      {telemetry.keyframeObservations.length > 0 && (
        <div className="rounded-xl border bg-card/40 p-4 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" />
            Keyframe Movement Phase Breakdown
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {telemetry.keyframeObservations.map((obs, idx) => {
              const riskCfg =
                obs.riskLevel === "low"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : obs.riskLevel === "moderate"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border bg-background/50 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                      {obs.timestampSec.toFixed(2)}s
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate flex-1 ml-1.5">
                      {obs.phase}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase tracking-wider font-semibold px-1 py-0 ${riskCfg}`}
                    >
                      {obs.riskLevel} risk
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {obs.observation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Recommended Corrective Drills */}
      {telemetry.recommendedCorrectiveDrills.length > 0 && (
        <div className="rounded-xl border bg-gradient-to-br from-card via-card to-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Dumbbell className="size-3.5 text-primary" />
              Prescribed Corrective Drills
            </span>

            {canManage && (
              <Button
                size="sm"
                variant={appliedToPlanId ? "outline" : "default"}
                onClick={() => setApplyModalOpen(true)}
                className="h-7 text-xs gap-1.5"
              >
                {appliedToPlanId ? (
                  <>
                    <RotateCcw className="size-3" />
                    Re-Apply to Plan
                  </>
                ) : (
                  <>
                    <Zap className="size-3" />
                    1-Click Plan Integration
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {telemetry.recommendedCorrectiveDrills.map((drill, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border bg-background/80 flex flex-col justify-between space-y-2 shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-xs text-foreground leading-tight">
                      {drill.name}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded">
                      {drill.sets} × {drill.reps}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground mt-1.5 block max-w-fit truncate"
                  >
                    Focus: {drill.focusArea}
                  </Badge>
                </div>

                <div className="pt-2 border-t text-[11px] text-muted-foreground italic leading-relaxed">
                  "{drill.coachingCue}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply to Training Plan Dialog */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="size-5 text-primary" />
              Link Corrective Drills to Training Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign the {telemetry.recommendedCorrectiveDrills.length} AI-recommended corrective exercises to an active training plan or generate a new rehab/corrective protocol.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Target Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanMode("new")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedPlanMode === "new"
                      ? "border-primary bg-primary/10 ring-1 ring-primary font-medium"
                      : "border-muted hover:border-foreground/30 bg-card"
                  }`}
                >
                  <span className="text-xs block font-semibold">New Plan</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Phase: Rehab / Return to Play
                  </span>
                </button>

                <button
                  type="button"
                  disabled={activePlans.length === 0}
                  onClick={() => setSelectedPlanMode("existing")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    activePlans.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    selectedPlanMode === "existing"
                      ? "border-primary bg-primary/10 ring-1 ring-primary font-medium"
                      : "border-muted hover:border-foreground/30 bg-card"
                  }`}
                >
                  <span className="text-xs block font-semibold">Existing Plan</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    {activePlans.length} active plan(s) available
                  </span>
                </button>
              </div>
            </div>

            {selectedPlanMode === "existing" && (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Select Active Plan
                </label>
                <Select
                  value={selectedExistingPlanId}
                  onValueChange={setSelectedExistingPlanId}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Choose athlete training plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlans.map((p) => (
                      <SelectItem key={p._id} value={p._id} className="text-xs">
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">
                Drills to be attached:
              </span>
              <ul className="list-disc pl-4 space-y-0.5">
                {telemetry.recommendedCorrectiveDrills.map((d, i) => (
                  <li key={i}>
                    {d.name} ({d.sets} × {d.reps})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApplyModalOpen(false)}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyToPlan}
              disabled={
                isApplying ||
                (selectedPlanMode === "existing" && !selectedExistingPlanId)
              }
              className="gap-1.5"
            >
              {isApplying ? (
                "Applying..."
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Confirm & Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
