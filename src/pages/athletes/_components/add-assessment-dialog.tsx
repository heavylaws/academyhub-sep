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
  { label: "Sprint 40m", unit: "s" },
  { label: "Vertical Jump", unit: "cm" },
  { label: "Broad Jump", unit: "cm" },
  { label: "Max Squat", unit: "kg" },
  { label: "Bench Press", unit: "kg" },
  { label: "Flexibility (sit & reach)", unit: "cm" },
  { label: "VO2 Max", unit: "ml/kg/min" },
  { label: "Resting HR", unit: "bpm" },
];

const formSchema = z.object({
  metric: z.string().trim().min(1, "Metric name is required"),
  unit: z.string(),
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
      value: "",
      assessedOn: todayLocal(),
      notes: "",
    },
  });

  const handlePreset = (label: string, unit: string) => {
    form.setValue("metric", label);
    form.setValue("unit", unit);
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      await recordAssessment({
        athleteId,
        metric: values.metric,
        value: Number(values.value),
        unit: values.unit || undefined,
        assessedOn: values.assessedOn,
        notes: values.notes || undefined,
      });
      toast.success("Assessment recorded");
      form.reset({
        metric: "",
        unit: "",
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
                    onClick={() => handlePreset(p.label, p.unit)}
                    className="rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/30 hover:border-accent/50 active:scale-95 bg-muted/20"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
