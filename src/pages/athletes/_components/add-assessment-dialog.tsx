import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  SOCCER_DRILLS,
  combineAllDrills,
  getDrillMetricSpec,
} from "@/data/soccer-drills.ts";

/** Common metric presets shown as quick-select chips. */
const METRIC_PRESETS = [
  { label: "Sprint 40m", unit: "s", corner: "physical" as const, direction: "lower_is_better" as const },
  { label: "Vertical Jump", unit: "cm", corner: "physical" as const, direction: "higher_is_better" as const },
  { label: "Broad Jump", unit: "cm", corner: "physical" as const, direction: "higher_is_better" as const },
  { label: "Max Squat", unit: "kg", corner: "physical" as const, direction: "higher_is_better" as const },
  { label: "Bench Press", unit: "kg", corner: "physical" as const, direction: "higher_is_better" as const },
  { label: "Flexibility (sit & reach)", unit: "cm", corner: "physical" as const, direction: "higher_is_better" as const },
  { label: "VO2 Max", unit: "ml/kg/min", corner: "physical" as const, direction: "higher_is_better" as const },
  { label: "Passing Accuracy", unit: "%", corner: "technical" as const, direction: "higher_is_better" as const },
  { label: "First Touch Quality", unit: "1-10", corner: "technical" as const, direction: "higher_is_better" as const },
  { label: "Tactical Positioning", unit: "1-10", corner: "tactical" as const, direction: "higher_is_better" as const },
  { label: "Pressing Awareness", unit: "1-10", corner: "tactical" as const, direction: "higher_is_better" as const },
  { label: "Resilience / Composure", unit: "1-10", corner: "psychological" as const, direction: "higher_is_better" as const },
];

const formSchema = z.object({
  metric: z.string().trim().min(1, "Metric name is required"),
  unit: z.string(),
  corner: z.enum(["physical", "technical", "tactical", "psychological"]),
  optimizationDirection: z.enum(["higher_is_better", "lower_is_better"]),
  ageGroupSnapshot: z.string().optional(),
  value: z.string().min(1, "Value is required"),
  assessedOn: z.string().min(1, "Date is required"),
  notes: z.string(),
});

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddAssessmentDialog({
  open,
  onOpenChange,
  athleteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: Id<"athletes">;
}) {
  const recordAssessment = useMutation(api.assessments.recordAssessment);
  const existingData = useQuery(api.assessments.listAssessmentsForAthlete, {
    athleteId,
  });
  const [submitting, setSubmitting] = useState(false);

  const existingMetrics =
    existingData?.map((d) => ({
      label: d.metric,
      unit: d.unit ?? "",
      corner: "physical" as const,
      direction: "higher_is_better" as const,
    })) ?? [];

  // Merge presets with existing custom metrics (deduplicate by label)
  const allPresets = [
    ...METRIC_PRESETS,
    ...existingMetrics.filter(
      (m) => !METRIC_PRESETS.some((p) => p.label === m.label),
    ),
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metric: "",
      unit: "",
      corner: "physical",
      optimizationDirection: "higher_is_better",
      ageGroupSnapshot: "",
      value: "",
      assessedOn: todayLocal(),
      notes: "",
    },
  });

  const handlePreset = (
    label: string,
    unit: string,
    corner: "physical" | "technical" | "tactical" | "psychological" = "physical",
    direction: "higher_is_better" | "lower_is_better" = "higher_is_better",
  ) => {
    form.setValue("metric", label);
    form.setValue("unit", unit);
    form.setValue("corner", corner);
    form.setValue("optimizationDirection", direction);
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      await recordAssessment({
        athleteId,
        metric: values.metric,
        value: Number(values.value),
        unit: values.unit || undefined,
        corner: values.corner,
        optimizationDirection: values.optimizationDirection,
        ageGroupSnapshot: values.ageGroupSnapshot?.trim() || undefined,
        assessedOn: values.assessedOn,
        notes: values.notes || undefined,
      });
      toast.success("Assessment recorded");
      form.reset({
        metric: "",
        unit: "",
        corner: "physical",
        optimizationDirection: "higher_is_better",
        ageGroupSnapshot: "",
        value: "",
        assessedOn: todayLocal(),
        notes: "",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to record assessment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next)
          form.reset({
            metric: "",
            unit: "",
            corner: "physical",
            optimizationDirection: "higher_is_better",
            ageGroupSnapshot: "",
            value: "",
            assessedOn: todayLocal(),
            notes: "",
          });
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record assessment</DialogTitle>
          <DialogDescription>
            Add a performance data point for this athlete.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Quick preset chips */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Quick select
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allPresets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePreset(p.label, p.unit, p.corner, p.direction)}
                    className="rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/30 hover:border-accent/50 active:scale-95 bg-muted/20"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="corner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>4-Corner Area</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 sm:h-10 text-sm">
                          <SelectValue placeholder="Select corner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="physical">Physical</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="tactical">Tactical</SelectItem>
                        <SelectItem value="psychological">Psychological</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="optimizationDirection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Optimization Target</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 sm:h-10 text-sm">
                          <SelectValue placeholder="Target direction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="higher_is_better">Higher is better (Jump/Rating)</SelectItem>
                        <SelectItem value="lower_is_better">Lower is better (Sprint/Time)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="metric"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Metric</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Sprint 40m"
                        className="h-11 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="s"
                        className="h-11 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="4.62"
                        className="h-11 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assessedOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-11 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ageGroupSnapshot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Group (opt)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="U16"
                        className="h-11 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conditions, technique observations…"
                      rows={2}
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 sm:h-9 text-xs sm:text-sm font-semibold w-full sm:w-auto"
              >
                {submitting && <Spinner className="size-4" />}
                Save assessment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
