import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Dumbbell, Plus, Trash2, Zap } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

interface LogWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: Id<"athletes">;
  planId: Id<"trainingPlans">;
  planTitle: string;
}

interface ExerciseEntry {
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightKg?: number;
}

const RPE_DESCRIPTIONS: Record<number, string> = {
  1: "Very light (rest / gentle walk)",
  2: "Light (easy warm-up)",
  3: "Moderate (comfortable pace)",
  4: "Somewhat hard (steady effort)",
  5: "Hard (heavy breathing)",
  6: "Hard + (sustainable effort)",
  7: "Very hard (cannot talk easily)",
  8: "Very hard + (straining)",
  9: "Extremely hard (near peak limit)",
  10: "Maximum effort (total exhaustion)",
};

export default function LogWorkoutDialog({
  open,
  onOpenChange,
  athleteId,
  planId,
  planTitle,
}: LogWorkoutDialogProps) {
  const planData = useQuery(api.trainingPlans.getPlan, { planId });
  const logWorkout = useMutation(api.workload.logWorkoutExecution);

  const [durationMinutes, setDurationMinutes] = useState(45);
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize exercises from plan items if available
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [initializedPlanId, setInitializedPlanId] = useState<string | null>(null);

  if (planData && planData.plan._id !== initializedPlanId) {
    const initial =
      planData.items && planData.items.length > 0
        ? planData.items.map((item) => ({
            exerciseName: item.name,
            setsCompleted: item.sets ?? 3,
            repsCompleted: item.reps ? String(item.reps) : "10",
            weightKg: undefined,
          }))
        : [{ exerciseName: "Warm-up / Core", setsCompleted: 3, repsCompleted: "12", weightKg: undefined }];
    setExercises(initial);
    setInitializedPlanId(planData.plan._id);
  }

  const calculatedLoad = Math.round(durationMinutes * rpe);

  const handleAddExercise = () => {
    setExercises((prev) => [
      ...prev,
      { exerciseName: "", setsCompleted: 3, repsCompleted: "10" },
    ]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (
    index: number,
    field: keyof ExerciseEntry,
    value: string | number | undefined,
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0) {
      toast.error("Please enter a valid workout duration");
      return;
    }
    setIsSubmitting(true);

    const validExercises = exercises
      .filter((ex) => ex.exerciseName.trim().length > 0)
      .map((ex) => ({
        exerciseName: ex.exerciseName.trim(),
        setsCompleted: Number(ex.setsCompleted) || 1,
        repsCompleted: String(ex.repsCompleted || "1"),
        weightKg: ex.weightKg !== undefined && Number(ex.weightKg) > 0 ? Number(ex.weightKg) : undefined,
      }));

    try {
      await logWorkout({
        athleteId,
        trainingPlanId: planId,
        durationMinutes,
        rpe,
        completedExercises:
          validExercises.length > 0
            ? validExercises
            : [{ exerciseName: planTitle, setsCompleted: 1, repsCompleted: "1" }],
        athleteNotes: notes.trim() || undefined,
      });

      toast.success(
        `Logged workout execution (${calculatedLoad} AU training load added)`,
      );
      onOpenChange(false);
      setNotes("");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to log workout",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            <span>Log Workout Completion & Load</span>
          </DialogTitle>
          <DialogDescription>
            Record session RPE and off-pitch training load for{" "}
            <strong className="text-foreground">{planTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Workload Inputs: Duration and RPE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duration (Minutes) *</Label>
              <Input
                type="number"
                min={1}
                max={360}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">RPE Intensity (1–10) *</Label>
                <span className="font-bold text-sm text-primary">RPE {rpe}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={rpe}
                onChange={(e) => setRpe(parseInt(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {RPE_DESCRIPTIONS[rpe]}
              </p>
            </div>
          </div>

          {/* Realtime Calculated Session Load Banner */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              <span className="text-xs font-medium">Session RPE Calculated Load:</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-xl font-bold text-primary">
                {calculatedLoad}
              </span>
              <span className="text-xs text-muted-foreground">Arbitrary Units (AU)</span>
            </div>
          </div>

          {/* Exercises Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Completed Exercises</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExercise}
                className="text-[11px] h-7 gap-1"
              >
                <Plus className="size-3" />
                Add Exercise
              </Button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border bg-background p-2 text-xs"
                >
                  <Input
                    placeholder="Exercise name"
                    value={ex.exerciseName}
                    onChange={(e) =>
                      handleUpdateExercise(idx, "exerciseName", e.target.value)
                    }
                    className="flex-1 text-xs h-8"
                  />
                  <div className="flex items-center gap-1 w-20 shrink-0">
                    <Input
                      type="number"
                      placeholder="Sets"
                      min={1}
                      value={ex.setsCompleted}
                      onChange={(e) =>
                        handleUpdateExercise(
                          idx,
                          "setsCompleted",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="text-xs h-8 text-center"
                    />
                    <span className="text-muted-foreground">×</span>
                  </div>
                  <Input
                    placeholder="Reps (e.g. 10)"
                    value={ex.repsCompleted}
                    onChange={(e) =>
                      handleUpdateExercise(idx, "repsCompleted", e.target.value)
                    }
                    className="w-20 text-xs h-8 text-center shrink-0"
                  />
                  <Input
                    type="number"
                    placeholder="Kg"
                    value={ex.weightKg ?? ""}
                    onChange={(e) =>
                      handleUpdateExercise(
                        idx,
                        "weightKg",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    className="w-16 text-xs h-8 text-center shrink-0"
                  />
                  {exercises.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExercise(idx)}
                      className="size-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Athlete Notes / Feedback</Label>
            <Textarea
              placeholder="How did you feel? Any fatigue, soreness, or form notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Save Workout & Load"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
